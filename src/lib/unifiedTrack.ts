// Unified track interface that supports Wavlake, PodcastIndex, and native Nostr tracks
import type { WavlakeTrack } from './wavlake';
import type { PodcastIndexEpisode, PodcastIndexFeed, PodcastIndexTop100Item, ValueBlock } from './podcastindex';
import type { NostrEvent } from '@nostrify/nostrify';

export type TrackSource = 'wavlake' | 'podcastindex' | 'nostr';

// Interface for Nostr Music Track events (kind 36787)
export interface NostrMusicTrack {
  event: NostrEvent;
  d: string;
  title: string;
  artist: string;
  url: string; // Audio file URL
  image?: string;
  video?: string;
  album?: string;
  trackNumber?: string;
  released?: string;
  duration?: number;
  format?: string;
  bitrate?: string;
  sampleRate?: string;
  language?: string;
  explicit?: boolean;
  genres: string[]; // From 't' tags
  content: string; // Lyrics/credits
}

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

  // Nostr-specific properties
  nostrEvent?: NostrEvent; // Original event for kind 36787 tracks
  nostrPubkey?: string; // Author pubkey for Nostr tracks
  nostrDTag?: string; // d tag for addressable events
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

export function isNostrTrack(track: UnifiedTrack): boolean {
  return track.source === 'nostr';
}

// Parse a Nostr event (kind 36787) into NostrMusicTrack
export function parseNostrMusicTrack(event: NostrEvent): NostrMusicTrack | null {
  // Validate it's a music track event
  if (event.kind !== 36787) return null;

  const getTag = (name: string): string | undefined =>
    event.tags.find(tag => tag[0] === name)?.[1];

  const d = getTag('d');
  const title = getTag('title');
  const artist = getTag('artist');
  const url = getTag('url');

  // Required tags
  if (!d || !title || !artist || !url) return null;

  // Must have 't' tag with 'music'
  const tTags = event.tags.filter(tag => tag[0] === 't').map(tag => tag[1]);
  if (!tTags.includes('music')) return null;

  const durationStr = getTag('duration');

  return {
    event,
    d,
    title,
    artist,
    url,
    image: getTag('image'),
    video: getTag('video'),
    album: getTag('album'),
    trackNumber: getTag('track_number'),
    released: getTag('released'),
    duration: durationStr ? parseInt(durationStr, 10) : undefined,
    format: getTag('format'),
    bitrate: getTag('bitrate'),
    sampleRate: getTag('sample_rate'),
    language: getTag('language'),
    explicit: getTag('explicit') === 'true',
    genres: tTags.filter(t => t !== 'music'),
    content: event.content,
  };
}

// Convert NostrMusicTrack to UnifiedTrack
export function nostrTrackToUnified(track: NostrMusicTrack): UnifiedTrack {
  return {
    id: `nostr-${track.event.pubkey}-${track.d}`,
    sourceId: track.d,
    source: 'nostr',
    title: track.title,
    artist: track.artist,
    albumTitle: track.album || '',
    albumArtUrl: track.image || '',
    artistArtUrl: track.image || '',
    mediaUrl: track.url,
    duration: track.duration || 0,
    releaseDate: track.released || new Date(track.event.created_at * 1000).toISOString(),
    genre: track.genres.length > 0 ? track.genres[0] : undefined,
    description: track.content,
    nostrEvent: track.event,
    nostrPubkey: track.event.pubkey,
    nostrDTag: track.d,
  };
}

// Validate a Nostr event as a valid music track
export function validateNostrMusicTrack(event: NostrEvent): boolean {
  return parseNostrMusicTrack(event) !== null;
}
