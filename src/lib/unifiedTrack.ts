// Unified track interface that supports both Wavlake and PodcastIndex tracks
import type { WavlakeTrack } from './wavlake';
import type { PodcastIndexEpisode, PodcastIndexFeed, PodcastIndexTop100Item, ValueBlock } from './podcastindex';

export type TrackSource = 'wavlake' | 'podcastindex';

export interface UnifiedTrack {
  // Common properties
  id: string;
  title: string;
  artist: string;
  albumTitle: string;
  albumArtUrl: string;
  artistArtUrl: string;
  mediaUrl: string;
  duration: number;
  releaseDate: string;

  // Source-specific metadata
  source: TrackSource;
  sourceId: string; // Original ID from the source

  // Optional properties
  artistId?: string;
  albumId?: string;
  msatTotal?: string;
  artistNpub?: string;
  order?: number;
  genre?: string;
  url?: string;

  // PodcastIndex specific
  feedId?: number;
  feedUrl?: string;
  episodeGuid?: string;
  description?: string;

  // Podcasting 2.0 value block for lightning payments
  value?: ValueBlock;
}

// Convert WavlakeTrack to UnifiedTrack
export function wavlakeToUnified(track: WavlakeTrack): UnifiedTrack {
  return {
    id: `wavlake-${track.id}`,
    sourceId: track.id,
    source: 'wavlake',
    title: track.title,
    artist: track.artist,
    albumTitle: track.albumTitle,
    albumArtUrl: track.albumArtUrl,
    artistArtUrl: track.artistArtUrl,
    mediaUrl: track.mediaUrl,
    duration: track.duration,
    releaseDate: track.releaseDate,
    artistId: track.artistId,
    albumId: track.albumId,
    msatTotal: track.msatTotal,
    artistNpub: track.artistNpub,
    order: track.order,
    genre: track.genre,
    url: track.url || `https://wavlake.com/track/${track.id}`,
  };
}

// Convert PodcastIndex episode to UnifiedTrack
export function podcastIndexEpisodeToUnified(
  episode: PodcastIndexEpisode,
  feed?: PodcastIndexFeed
): UnifiedTrack {
  // Episode-level value block takes precedence over feed-level
  const valueBlock = episode.value || feed?.value;

  return {
    id: `podcastindex-${episode.id}`,
    sourceId: episode.id.toString(),
    source: 'podcastindex',
    title: episode.title,
    artist: feed?.author || episode.feedTitle,
    albumTitle: feed?.title || episode.feedTitle,
    albumArtUrl: episode.image || episode.feedImage || feed?.image || '',
    artistArtUrl: episode.feedImage || feed?.image || '',
    mediaUrl: episode.enclosureUrl,
    duration: episode.duration,
    releaseDate: new Date(episode.datePublished * 1000).toISOString(),
    feedId: episode.feedId,
    feedUrl: feed?.url,
    episodeGuid: episode.guid,
    description: episode.description,
    url: episode.link,
    value: valueBlock,
  };
}

// Convert PodcastIndex Top100 item to UnifiedTrack
export function podcastIndexTop100ToUnified(item: PodcastIndexTop100Item): UnifiedTrack {
  return {
    id: `podcastindex-${item.itemGuid}`,
    sourceId: item.itemGuid,
    source: 'podcastindex',
    title: item.title,
    artist: item.author,
    albumTitle: item.title, // Use title as album since we don't have feed title
    albumArtUrl: item.image,
    artistArtUrl: item.image,
    mediaUrl: '', // We don't have the media URL from this endpoint
    duration: 0, // We don't have duration from this endpoint
    releaseDate: new Date().toISOString(), // Unknown from this endpoint
    feedId: item.feedId,
    feedUrl: item.feedUrl,
    episodeGuid: item.itemGuid,
    description: '',
    url: '',
    msatTotal: item.boosts,
  };
}

// Convert UnifiedTrack back to WavlakeTrack (for backward compatibility)
export function unifiedToWavlake(track: UnifiedTrack): WavlakeTrack {
  if (track.source !== 'wavlake') {
    throw new Error('Cannot convert non-Wavlake track to WavlakeTrack');
  }

  return {
    id: track.sourceId,
    title: track.title,
    artist: track.artist,
    albumTitle: track.albumTitle,
    albumArtUrl: track.albumArtUrl,
    artistArtUrl: track.artistArtUrl,
    mediaUrl: track.mediaUrl,
    duration: track.duration,
    releaseDate: track.releaseDate,
    artistId: track.artistId || '',
    albumId: track.albumId || '',
    msatTotal: track.msatTotal || '',
    artistNpub: track.artistNpub || '',
    order: track.order || 0,
    genre: track.genre,
    url: track.url,
  };
}

// Helper to check if a track is from a specific source
export function isWavlakeTrack(track: UnifiedTrack): boolean {
  return track.source === 'wavlake';
}

export function isPodcastIndexTrack(track: UnifiedTrack): boolean {
  return track.source === 'podcastindex';
}
