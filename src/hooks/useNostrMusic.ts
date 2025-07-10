import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import type { NostrEvent } from '@nostrify/nostrify';
import type { WavlakeTrack } from '@/lib/wavlake';

// Hook to get user's playlists (NIP-51 lists)
export function useUserPlaylists(pubkey?: string) {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const targetPubkey = pubkey || user?.pubkey;

  return useQuery({
    queryKey: ['user-playlists', targetPubkey],
    queryFn: async (c) => {
      if (!targetPubkey) return [];

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      const events = await nostr.query([
        {
          kinds: [30003], // Bookmark sets for playlists
          authors: [targetPubkey],
          '#t': ['music'], // Filter for music playlists
        }
      ], { signal });

      return events.sort((a, b) => b.created_at - a.created_at);
    },
    enabled: !!targetPubkey,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Hook to get "Liked Songs" bookmark set
export function useLikedSongs(pubkey?: string) {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const targetPubkey = pubkey || user?.pubkey;

  return useQuery({
    queryKey: ['liked-songs', targetPubkey],
    queryFn: async (c) => {
      if (!targetPubkey) return null;

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      const events = await nostr.query([
        {
          kinds: [30003], // Bookmark sets
          authors: [targetPubkey],
          '#d': ['liked-songs'], // Specific identifier for liked songs
        }
      ], { signal });

      // Return the most recent liked songs bookmark set
      return events.sort((a, b) => b.created_at - a.created_at)[0] || null;
    },
    enabled: !!targetPubkey,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Hook to get track reactions (likes)
export function useTrackReactions(trackUrl: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['track-reactions', trackUrl],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      const events = await nostr.query([
        {
          kinds: [7], // Reactions
          '#r': [trackUrl],
          limit: 100,
        }
      ], { signal });

      const likes = events.filter(event =>
        event.content === '+' || event.content === '❤️' || event.content === ''
      );

      return {
        likes,
        likeCount: likes.length,
      };
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Hook to get artist reactions (follows/likes)
export function useArtistReactions(artistNpub: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['artist-reactions', artistNpub],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      const events = await nostr.query([
        {
          kinds: [7], // Reactions
          '#p': [artistNpub],
          limit: 100,
        }
      ], { signal });

      const likes = events.filter(event =>
        event.content === '+' || event.content === '❤️' || event.content === ''
      );

      return {
        likes,
        likeCount: likes.length,
      };
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Hook to get track comments
export function useTrackComments(trackUrl: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['track-comments', trackUrl],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      const events = await nostr.query([
        {
          kinds: [1], // Text notes
          '#r': [trackUrl],
          limit: 50,
        }
      ], { signal });

      return events.sort((a, b) => b.created_at - a.created_at);
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Hook to create a playlist
export function useCreatePlaylist() {
  const { mutate: createEvent } = useNostrPublish();
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();

  return useMutation({
    mutationFn: async ({ name, description, tracks }: {
      name: string;
      description?: string;
      tracks?: string[];
    }) => {
      const tags = [
        ['d', `playlist-${Date.now()}`],
        ['title', name],
        ['t', 'music'],
      ];

      if (description) {
        tags.push(['description', description]);
      }

      // Add track URLs as 'r' tags
      if (tracks) {
        tracks.forEach(trackUrl => {
          tags.push(['r', trackUrl]);
        });
      }

      createEvent({
        kind: 30003, // Bookmark sets
        content: '',
        tags,
      });
    },
    onSuccess: () => {
      if (user?.pubkey) {
        queryClient.invalidateQueries({ queryKey: ['user-playlists', user.pubkey] });
      }
    },
  });
}

// Hook to add track to playlist
export function useAddToPlaylist() {
  const { mutate: createEvent } = useNostrPublish();
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();

  return useMutation({
    mutationFn: async ({ playlistEvent, trackUrl }: {
      playlistEvent: NostrEvent;
      trackUrl: string;
    }) => {
      // Create updated playlist with new track
      const existingTracks = playlistEvent.tags
        .filter(tag => tag[0] === 'r')
        .map(tag => tag[1]);

      if (existingTracks.includes(trackUrl)) {
        throw new Error('Track already in playlist');
      }

      const newTags = [
        ...playlistEvent.tags.filter(tag => tag[0] !== 'r'),
        ...existingTracks.map(url => ['r', url]),
        ['r', trackUrl],
      ];

      createEvent({
        kind: 30003,
        content: playlistEvent.content,
        tags: newTags,
      });
    },
    onSuccess: () => {
      if (user?.pubkey) {
        queryClient.invalidateQueries({ queryKey: ['user-playlists', user.pubkey] });
      }
    },
  });
}

// Hook to like a track (add to Liked Songs and create reaction)
export function useLikeTrack() {
  const { mutate: createEvent } = useNostrPublish();
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();

  return useMutation({
    mutationFn: async ({ trackUrl }: {
      track: WavlakeTrack;
      trackUrl: string;
    }) => {
      // Create reaction event
      createEvent({
        kind: 7, // Reaction
        content: '❤️',
        tags: [
          ['r', trackUrl],
          ['k', '1'], // Reacting to a note-like content
        ],
      });

      // Add to Liked Songs bookmark set
      // First get existing liked songs
      const likedSongsEvents = await queryClient.fetchQuery({
        queryKey: ['liked-songs', user?.pubkey],
      });

      const existingLikedSongs = likedSongsEvents as NostrEvent | null;
      const existingTracks = existingLikedSongs?.tags
        .filter(tag => tag[0] === 'r')
        .map(tag => tag[1]) || [];

      if (!existingTracks.includes(trackUrl)) {
        const tags = [
          ['d', 'liked-songs'], // Unique identifier for liked songs
          ['title', 'Liked Songs'],
          ['description', 'My favorite tracks'],
          ['t', 'music'],
          ...existingTracks.map(url => ['r', url]),
          ['r', trackUrl],
        ];

        createEvent({
          kind: 30003, // Bookmark sets
          content: '',
          tags,
        });
      }
    },
    onSuccess: (_, { trackUrl }) => {
      if (user?.pubkey) {
        queryClient.invalidateQueries({ queryKey: ['liked-songs', user.pubkey] });
        queryClient.invalidateQueries({ queryKey: ['track-reactions', trackUrl] });
      }
    },
  });
}

// Hook to like an artist
export function useLikeArtist() {
  const { mutate: createEvent } = useNostrPublish();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ artistNpub }: { artistNpub: string }) => {
      createEvent({
        kind: 7, // Reaction
        content: '❤️',
        tags: [
          ['p', artistNpub],
          ['k', '0'], // Reacting to a profile
        ],
      });
    },
    onSuccess: (_, { artistNpub }) => {
      queryClient.invalidateQueries({ queryKey: ['artist-reactions', artistNpub] });
    },
  });
}

// Hook to update now playing status
export function useUpdateNowPlaying() {
  const { mutate: createEvent } = useNostrPublish();

  return useMutation({
    mutationFn: async ({ track, trackUrl }: {
      track: WavlakeTrack;
      trackUrl: string;
    }) => {
      const content = `${track.title} - ${track.artist}`;
      const expiration = Math.floor(Date.now() / 1000) + track.duration;

      createEvent({
        kind: 30315, // User Status
        content,
        tags: [
          ['d', 'music'],
          ['r', trackUrl],
          ['expiration', expiration.toString()],
        ],
      });
    },
  });
}

// Hook to comment on a track
export function useCommentOnTrack() {
  const { mutate: createEvent } = useNostrPublish();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ content, trackUrl }: {
      content: string;
      trackUrl: string;
    }) => {
      createEvent({
        kind: 1, // Text note
        content,
        tags: [
          ['r', trackUrl],
          ['t', 'music'],
        ],
      });
    },
    onSuccess: (_, { trackUrl }) => {
      queryClient.invalidateQueries({ queryKey: ['track-comments', trackUrl] });
    },
  });
}

// Hook to edit a playlist
export function useEditPlaylist() {
  const { mutate: createEvent } = useNostrPublish();
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();

  return useMutation({
    mutationFn: async ({
      playlistEvent,
      name,
      description,
      tracks
    }: {
      playlistEvent: NostrEvent;
      name: string;
      description?: string;
      tracks?: string[];
    }) => {
      // Get the d tag (identifier) from the original playlist
      const dTag = playlistEvent.tags.find(tag => tag[0] === 'd')?.[1];
      if (!dTag) {
        throw new Error('Invalid playlist: missing identifier');
      }

      const tags = [
        ['d', dTag], // Keep the same identifier to replace the event
        ['title', name],
        ['t', 'music'],
      ];

      if (description) {
        tags.push(['description', description]);
      }

      // Add track URLs as 'r' tags
      if (tracks) {
        tracks.forEach(trackUrl => {
          tags.push(['r', trackUrl]);
        });
      }

      createEvent({
        kind: 30003, // Bookmark sets
        content: '',
        tags,
      });
    },
    onSuccess: () => {
      if (user?.pubkey) {
        queryClient.invalidateQueries({ queryKey: ['user-playlists', user.pubkey] });
      }
    },
  });
}

// Hook to delete a playlist
export function useDeletePlaylist() {
  const { mutate: createEvent } = useNostrPublish();
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();

  return useMutation({
    mutationFn: async ({ playlistEvent }: { playlistEvent: NostrEvent }) => {
      // Get the d tag (identifier) from the playlist
      const dTag = playlistEvent.tags.find(tag => tag[0] === 'd')?.[1];
      if (!dTag) {
        throw new Error('Invalid playlist: missing identifier');
      }

      // Create a deletion event (kind 5)
      createEvent({
        kind: 5, // Deletion
        content: 'Deleted playlist',
        tags: [
          ['e', playlistEvent.id], // Reference to the event being deleted
          ['a', `30003:${playlistEvent.pubkey}:${dTag}`], // Address reference
        ],
      });
    },
    onSuccess: () => {
      if (user?.pubkey) {
        queryClient.invalidateQueries({ queryKey: ['user-playlists', user.pubkey] });
      }
    },
  });
}

// Hook to remove track from playlist
export function useRemoveFromPlaylist() {
  const { mutate: createEvent } = useNostrPublish();
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();

  return useMutation({
    mutationFn: async ({ playlistEvent, trackUrl }: {
      playlistEvent: NostrEvent;
      trackUrl: string;
    }) => {
      // Get the d tag (identifier) from the original playlist
      const dTag = playlistEvent.tags.find(tag => tag[0] === 'd')?.[1];
      if (!dTag) {
        throw new Error('Invalid playlist: missing identifier');
      }

      // Remove the track from existing tracks
      const existingTracks = playlistEvent.tags
        .filter(tag => tag[0] === 'r')
        .map(tag => tag[1])
        .filter(url => url !== trackUrl);

      const newTags = [
        ...playlistEvent.tags.filter(tag => tag[0] !== 'r'),
        ...existingTracks.map(url => ['r', url]),
      ];

      createEvent({
        kind: 30003,
        content: playlistEvent.content,
        tags: newTags,
      });
    },
    onSuccess: () => {
      if (user?.pubkey) {
        queryClient.invalidateQueries({ queryKey: ['user-playlists', user.pubkey] });
      }
    },
  });
}