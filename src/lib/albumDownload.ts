import JSZip from 'jszip';
import { WavlakeTrack, WavlakeAlbum } from '@/lib/wavlake';

export interface DownloadProgress {
  current: number;
  total: number;
  currentTrack?: string;
}

/**
 * Downloads a file with retry logic
 */
async function fetchWithRetry(
  url: string,
  maxRetries: number = 3,
  retryDelay: number = 1000
): Promise<Blob> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.blob();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`Attempt ${attempt}/${maxRetries} failed for ${url}:`, lastError.message);

      // Wait before retrying (unless it's the last attempt)
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      }
    }
  }

  throw lastError || new Error('Download failed after retries');
}

/**
 * Downloads all tracks from an album as a zip file with progress tracking
 */
export async function downloadAlbumAsZip(
  album: WavlakeAlbum,
  onProgress?: (progress: DownloadProgress) => void
): Promise<void> {
  try {
    const zip = new JSZip();

    // Create a folder for the album
    const albumFolder = zip.folder(sanitizeFileName(album.title));

    if (!albumFolder) {
      throw new Error('Failed to create album folder');
    }

    // Total items to download (tracks + album art)
    const totalItems = album.tracks.length + 1;
    let completedItems = 0;

    // Download album art
    try {
      onProgress?.({
        current: completedItems,
        total: totalItems,
        currentTrack: 'Album artwork'
      });

      const albumArtBlob = await fetchWithRetry(album.albumArtUrl);

      // Determine file extension from content type or URL
      const contentType = albumArtBlob.type;
      let extension = 'jpg';
      if (contentType.includes('png')) extension = 'png';
      else if (contentType.includes('webp')) extension = 'webp';
      else if (contentType.includes('jpeg') || contentType.includes('jpg')) extension = 'jpg';

      albumFolder.file(`cover.${extension}`, albumArtBlob);
      completedItems++;
    } catch (error) {
      console.warn('Failed to download album art:', error);
      // Continue even if album art fails
    }

    // Download all tracks sequentially to better track progress
    for (let index = 0; index < album.tracks.length; index++) {
      const track = album.tracks[index];

      onProgress?.({
        current: completedItems,
        total: totalItems,
        currentTrack: track.title
      });

      try {
        // Fetch the audio file with retry logic
        const audioBlob = await fetchWithRetry(track.mediaUrl);

        // Generate filename with track number
        const trackNumber = String(index + 1).padStart(2, '0');
        const fileName = `${trackNumber} - ${sanitizeFileName(track.title)}.mp3`;

        // Add to zip
        albumFolder.file(fileName, audioBlob);
        completedItems++;
      } catch (error) {
        console.error(`Failed to download track ${track.title} after retries:`, error);
        throw new Error(`Failed to download "${track.title}" after multiple attempts`);
      }
    }

    // Generate the zip file
    onProgress?.({
      current: completedItems,
      total: totalItems,
      currentTrack: 'Creating zip file...'
    });

    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    // Create download link
    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${sanitizeFileName(album.title)}.zip`;

    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up
    URL.revokeObjectURL(url);

  } catch (error) {
    console.error('Error downloading album:', error);
    throw error instanceof Error ? error : new Error('Failed to download album. Please try again.');
  }
}

/**
 * Sanitizes a filename by removing invalid characters
 */
function sanitizeFileName(fileName: string): string {
  // Remove characters that are invalid in filenames
  return fileName
    .replace(/[<>:"/\\|?*]/g, '') // Remove invalid characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .substring(0, 200); // Limit length
}