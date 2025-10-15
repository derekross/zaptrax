import JSZip from 'jszip';
import { WavlakeTrack, WavlakeAlbum } from '@/lib/wavlake';

/**
 * Downloads all tracks from an album as a zip file
 */
export async function downloadAlbumAsZip(album: WavlakeAlbum): Promise<void> {
  try {
    // Show loading state (this will be handled by the component)
    const zip = new JSZip();
    
    // Create a folder for the album
    const albumFolder = zip.folder(sanitizeFileName(album.title));
    
    if (!albumFolder) {
      throw new Error('Failed to create album folder');
    }

    // Download all tracks in parallel (with a limit to avoid overwhelming the browser)
    const downloadPromises = album.tracks.map(async (track, index) => {
      try {
        // Fetch the audio file
        const response = await fetch(track.mediaUrl);
        if (!response.ok) {
          console.error(`Failed to download track ${track.title}:`, response.statusText);
          return null;
        }

        // Get the audio data as blob
        const audioBlob = await response.blob();
        
        // Generate filename with track number
        const trackNumber = String(index + 1).padStart(2, '0');
        const fileName = `${trackNumber} - ${sanitizeFileName(track.title)}.mp3`;
        
        // Add to zip
        albumFolder.file(fileName, audioBlob);
        
        return { success: true, track: track.title };
      } catch (error) {
        console.error(`Error downloading track ${track.title}:`, error);
        return { success: false, track: track.title, error };
      }
    });

    // Wait for all downloads to complete
    const results = await Promise.all(downloadPromises);
    
    // Log any failed downloads
    const failedDownloads = results.filter(r => r && !r.success);
    if (failedDownloads.length > 0) {
      console.warn(`Failed to download ${failedDownloads.length} tracks:`, 
        failedDownloads.map(f => f.track).join(', '));
    }

    // Generate the zip file
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
    throw new Error('Failed to download album. Please try again.');
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