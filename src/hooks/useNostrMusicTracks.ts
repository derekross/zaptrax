import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { nip19 } from 'nostr-tools';
import type { NostrEvent } from '@nostrify/nostrify';
import {
  parseNostrMusicTrack,
  nostrTrackToUnified,
  type NostrMusicTrack,
  type UnifiedTrack,
} from '@/lib/unifiedTrack';

// Kind constants
const MUSIC_TRACK_KIND = 36787;
const MUSIC_PLAYLIST_KIND = 34139;

// Interface for Nostr Music Playlist events (kind 34139)
export interface NostrMusicPlaylist {
  event: NostrEvent;
  d: string;
  title: string;
  alt: string;
  description?: string;
  image?: string;
  trackRefs: Array<{
    kind: number;
    pubkey: string;
    dTag: string;
  }>;
  isPublic: boolean;
  isCollaborative: boolean;
  genres: string[];
}

// Parse a Nostr event (kind 34139) into NostrMusicPlaylist
export function parseNostrMusicPlaylist(event: NostrEvent): NostrMusicPlaylist | null {
  if (event.kind !== MUSIC_PLAYLIST_KIND) return null;

  const getTag = (name: string): string | undefined =>
    event.tags.find(tag => tag[0] === name)?.[1];

  const d = getTag('d');
  const title = getTag('title');
  const alt = getTag('alt');

  // Required tags
  if (!d || !title || !alt) return null;

  // Parse 'a' tags for track references (format: "36787:<pubkey>:<d-tag>")
  const trackRefs = event.tags
    .filter(tag => tag[0] === 'a')
    .map(tag => {
      const parts = tag[1].split(':');
      if (parts.length !== 3) return null;
      const kind = parseInt(parts[0], 10);
      if (kind !== MUSIC_TRACK_KIND) return null;
      return {
        kind,
        pubkey: parts[1],
        dTag: parts[2],
      };
    })
    .filter((ref): ref is NonNullable<typeof ref> => ref !== null);

  const tTags = event.tags.filter(tag => tag[0] === 't').map(tag => tag[1]);

  return {
    event,
    d,
    title,
    alt,
    description: getTag('description') || event.content,
    image: getTag('image'),
    trackRefs,
    isPublic: getTag('private') !== 'true',
    isCollaborative: getTag('collaborative') === 'true',
    genres: tTags.filter(t => t !== 'playlist'),
  };
}

// Validate a Nostr event as a valid music playlist
export function validateNostrMusicPlaylist(event: NostrEvent): boolean {
  return parseNostrMusicPlaylist(event) !== null;
}

// Hook to fetch recent Nostr music tracks (kind 36787)
export function useNostrMusicTracks(limit: number = 50) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['nostr-music-tracks', limit],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);

      const events = await nostr.query([
        {
          kinds: [MUSIC_TRACK_KIND],
          '#t': ['music'],
          limit,
        }
      ], { signal });

      // Parse and validate tracks
      const tracks: NostrMusicTrack[] = events
        .map(event => parseNostrMusicTrack(event))
        .filter((track): track is NostrMusicTrack => track !== null);

      // Sort by created_at descending (most recent first)
      tracks.sort((a, b) => b.event.created_at - a.event.created_at);

      return tracks;
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Hook to fetch Nostr music tracks by a specific author (pubkey)
export function useNostrMusicTracksByAuthor(pubkey: string | undefined, limit: number = 50) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['nostr-music-tracks-by-author', pubkey, limit],
    queryFn: async (c) => {
      if (!pubkey) return [];

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);

      const events = await nostr.query([
        {
          kinds: [MUSIC_TRACK_KIND],
          authors: [pubkey],
          '#t': ['music'],
          limit,
        }
      ], { signal });

      // Parse and validate tracks
      const tracks: NostrMusicTrack[] = events
        .map(event => parseNostrMusicTrack(event))
        .filter((track): track is NostrMusicTrack => track !== null);

      // Sort by created_at descending (most recent first)
      tracks.sort((a, b) => b.event.created_at - a.event.created_at);

      return tracks;
    },
    enabled: !!pubkey,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Hook to fetch a single Nostr music track by naddr
export function useNostrMusicTrack(naddr: string | undefined) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['nostr-music-track', naddr],
    queryFn: async (c) => {
      if (!naddr) return null;

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);

      // Decode naddr
      const decoded = nip19.decode(naddr);
      if (decoded.type !== 'naddr') {
        throw new Error('Invalid naddr');
      }

      const { kind, pubkey, identifier } = decoded.data;
      if (kind !== MUSIC_TRACK_KIND) {
        throw new Error('Not a music track event');
      }

      const events = await nostr.query([
        {
          kinds: [MUSIC_TRACK_KIND],
          authors: [pubkey],
          '#d': [identifier],
        }
      ], { signal });

      if (events.length === 0) return null;

      // Get the most recent version
      const latestEvent = events.sort((a, b) => b.created_at - a.created_at)[0];
      return parseNostrMusicTrack(latestEvent);
    },
    enabled: !!naddr,
    staleTime: 60 * 1000, // 1 minute
  });
}

// Hook to fetch Nostr music playlists (kind 34139)
export function useNostrMusicPlaylists(pubkey?: string, limit: number = 50) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['nostr-music-playlists', pubkey, limit],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);

      const filter: { kinds: number[]; authors?: string[]; limit: number } = {
        kinds: [MUSIC_PLAYLIST_KIND],
        limit,
      };

      if (pubkey) {
        filter.authors = [pubkey];
      }

      const events = await nostr.query([filter], { signal });

      // Parse and validate playlists
      const playlists: NostrMusicPlaylist[] = events
        .map(event => parseNostrMusicPlaylist(event))
        .filter((playlist): playlist is NostrMusicPlaylist => playlist !== null);

      // Sort by created_at descending
      playlists.sort((a, b) => b.event.created_at - a.event.created_at);

      return playlists;
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Hook to fetch a single Nostr music playlist by naddr with its tracks
export function useNostrMusicPlaylist(naddr: string | undefined) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['nostr-music-playlist', naddr],
    queryFn: async (c) => {
      if (!naddr) return null;

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);

      // Decode naddr
      const decoded = nip19.decode(naddr);
      if (decoded.type !== 'naddr') {
        throw new Error('Invalid naddr');
      }

      const { kind, pubkey, identifier } = decoded.data;
      if (kind !== MUSIC_PLAYLIST_KIND) {
        throw new Error('Not a music playlist event');
      }

      // Fetch the playlist event
      const playlistEvents = await nostr.query([
        {
          kinds: [MUSIC_PLAYLIST_KIND],
          authors: [pubkey],
          '#d': [identifier],
        }
      ], { signal });

      if (playlistEvents.length === 0) return null;

      const latestPlaylist = playlistEvents.sort((a, b) => b.created_at - a.created_at)[0];
      const playlist = parseNostrMusicPlaylist(latestPlaylist);

      if (!playlist) return null;

      // Fetch all referenced tracks
      const trackFilters = playlist.trackRefs.map(ref => ({
        kinds: [MUSIC_TRACK_KIND],
        authors: [ref.pubkey],
        '#d': [ref.dTag],
      }));

      if (trackFilters.length === 0) {
        return {
          playlist,
          tracks: [] as UnifiedTrack[],
        };
      }

      const trackEvents = await nostr.query(trackFilters, { signal });

      // Parse tracks and maintain order from playlist
      const trackMap = new Map<string, NostrMusicTrack>();
      trackEvents.forEach(event => {
        const track = parseNostrMusicTrack(event);
        if (track) {
          const key = `${event.pubkey}:${track.d}`;
          const existing = trackMap.get(key);
          // Keep the most recent version
          if (!existing || event.created_at > existing.event.created_at) {
            trackMap.set(key, track);
          }
        }
      });

      // Convert to UnifiedTrack and maintain playlist order
      const tracks: UnifiedTrack[] = playlist.trackRefs
        .map(ref => {
          const key = `${ref.pubkey}:${ref.dTag}`;
          const track = trackMap.get(key);
          return track ? nostrTrackToUnified(track) : null;
        })
        .filter((track): track is UnifiedTrack => track !== null);

      return {
        playlist,
        tracks,
      };
    },
    enabled: !!naddr,
    staleTime: 60 * 1000, // 1 minute
  });
}

// Hook to convert NostrMusicTrack array to UnifiedTrack array
export function useNostrTracksAsUnified(tracks: NostrMusicTrack[] | undefined): UnifiedTrack[] {
  if (!tracks) return [];
  return tracks.map(nostrTrackToUnified);
}

// Generate naddr for a Nostr music track
export function getNostrTrackNaddr(track: NostrMusicTrack): string {
  return nip19.naddrEncode({
    kind: MUSIC_TRACK_KIND,
    pubkey: track.event.pubkey,
    identifier: track.d,
  });
}

// Generate naddr for a Nostr music playlist
export function getNostrPlaylistNaddr(playlist: NostrMusicPlaylist): string {
  return nip19.naddrEncode({
    kind: MUSIC_PLAYLIST_KIND,
    pubkey: playlist.event.pubkey,
    identifier: playlist.d,
  });
}

// Hook to search Nostr music tracks by title or artist
export function useNostrMusicSearch(query: string, enabled: boolean = true) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['nostr-music-search', query],
    queryFn: async (c) => {
      if (!query || query.length < 2) return [];

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      const searchLower = query.toLowerCase();

      // Fetch recent music tracks and filter client-side
      // (Nostr relays don't support full-text search, so we fetch and filter)
      const events = await nostr.query([
        {
          kinds: [MUSIC_TRACK_KIND],
          '#t': ['music'],
          limit: 200, // Fetch more to have a better search pool
        }
      ], { signal });

      // Parse and filter tracks by title or artist
      const tracks: NostrMusicTrack[] = events
        .map(event => parseNostrMusicTrack(event))
        .filter((track): track is NostrMusicTrack => {
          if (!track) return false;
          const titleMatch = track.title.toLowerCase().includes(searchLower);
          const artistMatch = track.artist.toLowerCase().includes(searchLower);
          const albumMatch = track.album?.toLowerCase().includes(searchLower) ?? false;
          return titleMatch || artistMatch || albumMatch;
        });

      // Sort by relevance (title match first, then artist, then album)
      tracks.sort((a, b) => {
        const aTitle = a.title.toLowerCase().includes(searchLower);
        const bTitle = b.title.toLowerCase().includes(searchLower);
        if (aTitle && !bTitle) return -1;
        if (!aTitle && bTitle) return 1;
        return b.event.created_at - a.event.created_at;
      });

      return tracks.slice(0, 20); // Return top 20 results
    },
    enabled: enabled && query.length >= 2,
    staleTime: 30 * 1000,
  });
}
