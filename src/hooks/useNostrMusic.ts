import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import type { NostrEvent } from '@nostrify/nostrify';
import type { WavlakeTrack } from '@/lib/wavlake';
import type { UnifiedTrack } from '@/lib/unifiedTrack';
import { wavlakeToUnified } from '@/lib/unifiedTrack';

/** Shared helper: resolve per-user latest reactions, returning only likes. */
function resolveLatestLikes(events: NostrEvent[]): NostrEvent[] {
  const userReactions = new Map<string, NostrEvent>();
  for (const event of events) {
    const existing = userReactions.get(event.pubkey);
    if (!existing || event.created_at > existing.created_at) {
      userReactions.set(event.pubkey, event);
    }
  }
  return Array.from(userReactions.values()).filter(event =>
    event.content === '+' || event.content === '❤️' || event.content === ''
  );
}

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

      // Query all bookmark sets from the user
      const events = await nostr.query([
        {
          kinds: [30003], // Bookmark sets
          authors: [targetPubkey],
        }
      ], { signal });

      // Filter for music playlists: either has 't: music' tag OR 'd' tag starts with 'playlist-'
      const musicPlaylists = events.filter(event => {
        const hasMusicTag = event.tags.some(tag => tag[0] === 't' && tag[1] === 'music');
        const hasPlaylistDTag = event.tags.some(tag =>
          tag[0] === 'd' && tag[1]?.startsWith('playlist-')
        );

        // Exclude the special "liked-songs" playlist as it's handled separately
        const isLikedSongs = event.tags.some(tag => tag[0] === 'd' && tag[1] === 'liked-songs');

        return (hasMusicTag || hasPlaylistDTag) && !isLikedSongs;
      });

      return musicPlaylists.sort((a, b) => b.created_at - a.created_at);
    },
    enabled: !!targetPubkey,
    staleTime: 10 * 1000, // 10 seconds
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
    staleTime: 10 * 1000, // 10 seconds (invalidated on like/unlike)
  });
}

// Hook to get track reactions (likes)
export function useTrackReactions(trackUrl: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['track-reactions', trackUrl],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);

      const reactionEvents = await nostr.query([
        {
          kinds: [7], // Reactions
          '#r': [trackUrl],
          limit: 100,
        }
      ], { signal });

      // Get unique authors to scope deletion queries
      const authors = [...new Set(reactionEvents.map(e => e.pubkey))];

      // Only query deletions from authors who have reactions (scoped query)
      const deletionEvents = authors.length > 0
        ? await nostr.query([{
            kinds: [5],
            authors,
            '#k': ['7'],
            limit: 100,
          }], { signal })
        : [];

      // Create a set of deleted event IDs
      const deletedEventIds = new Set(
        deletionEvents.flatMap(deletion =>
          deletion.tags
            .filter(tag => tag[0] === 'e')
            .map(tag => tag[1])
        )
      );

      // Filter out deleted reactions and resolve per-user latest reaction
      const events = reactionEvents.filter(event => !deletedEventIds.has(event.id));
      const finalLikes = resolveLatestLikes(events);

      return {
        likes: finalLikes,
        likeCount: finalLikes.length,
      };
    },
    staleTime: 5 * 1000, // 5 seconds
  });
}

// Hook to get artist reactions (follows/likes)
export function useArtistReactions(artistNpub: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['artist-reactions', artistNpub],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);

      const reactionEvents = await nostr.query([
        {
          kinds: [7], // Reactions
          '#p': [artistNpub],
          limit: 100,
        }
      ], { signal });

      // Get unique authors to scope deletion queries
      const authors = [...new Set(reactionEvents.map(e => e.pubkey))];

      const deletionEvents = authors.length > 0
        ? await nostr.query([{
            kinds: [5],
            authors,
            '#k': ['7'],
            limit: 100,
          }], { signal })
        : [];

      // Create a set of deleted event IDs
      const deletedEventIds = new Set(
        deletionEvents.flatMap(deletion =>
          deletion.tags
            .filter(tag => tag[0] === 'e')
            .map(tag => tag[1])
        )
      );

      const events = reactionEvents.filter(event => !deletedEventIds.has(event.id));
      const finalLikes = resolveLatestLikes(events);

      return {
        likes: finalLikes,
        likeCount: finalLikes.length,
      };
    },
    staleTime: 10 * 1000, // 10 seconds
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

// Hook to get note comments (replies to a note)
export function useNoteComments(noteId: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['note-comments', noteId],
    queryFn: async (c) => {
      if (!noteId) return [];

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      const events = await nostr.query([
        {
          kinds: [1], // Text notes
          '#e': [noteId],
          limit: 50,
        }
      ], { signal });

      // Filter for replies (events that have the noteId in an 'e' tag with 'reply' marker)
      const replies = events.filter(event => {
        return event.tags.some(tag =>
          tag[0] === 'e' &&
          tag[1] === noteId &&
          (tag[3] === 'reply' || tag[3] === undefined) // Some clients don't use the marker
        );
      });

      return replies.sort((a, b) => a.created_at - b.created_at); // Chronological order for comments
    },
    enabled: !!noteId,
    staleTime: 5 * 1000, // 5 seconds
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
      tracks?: Array<UnifiedTrack | WavlakeTrack>;
    }) => {
      const tags = [
        ['d', `playlist-${Date.now()}`],
        ['title', name],
        ['t', 'music'],
      ];

      if (description) {
        tags.push(['description', description]);
      }

      // Add track URLs and metadata as tags
      if (tracks && tracks.length > 0) {
        tracks.forEach(track => {
          // Convert to UnifiedTrack format
          const unifiedTrack: UnifiedTrack = 'source' in track ? track : wavlakeToUnified(track);

          // Generate trackUrl based on source
          let trackUrl = '';
          if (unifiedTrack.source === 'wavlake') {
            trackUrl = unifiedTrack.url || `https://wavlake.com/track/${unifiedTrack.sourceId}`;
          } else if (unifiedTrack.source === 'podcastindex') {
            trackUrl = unifiedTrack.mediaUrl;
          }

          // Add track with metadata
          tags.push(['r', trackUrl]);
          tags.push(['track-title', trackUrl, unifiedTrack.title || '']);
          tags.push(['track-artist', trackUrl, unifiedTrack.artist || '']);
          tags.push(['track-image', trackUrl, unifiedTrack.albumArtUrl || '']);
          tags.push(['track-source', trackUrl, unifiedTrack.source || 'wavlake']);
          tags.push(['track-media-url', trackUrl, unifiedTrack.mediaUrl || '']);
          tags.push(['track-url', trackUrl, trackUrl]);
          tags.push(['track-duration', trackUrl, String(unifiedTrack.duration || 0)]);

          // Add feed ID for PodcastIndex tracks
          if (unifiedTrack.source === 'podcastindex' && unifiedTrack.feedId) {
            tags.push(['track-feed-id', trackUrl, String(unifiedTrack.feedId)]);
          }
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
        // Also invalidate social feed to show the new playlist
        queryClient.invalidateQueries({ queryKey: ['social-feed'] });
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
    mutationFn: async ({ playlistEvent, track, trackUrl }: {
      playlistEvent: NostrEvent;
      track: UnifiedTrack | WavlakeTrack;
      trackUrl: string;
    }) => {
      // Create updated playlist with new track
      const existingTracks = playlistEvent.tags
        .filter(tag => tag[0] === 'r')
        .map(tag => tag[1]);

      if (existingTracks.includes(trackUrl)) {
        throw new Error('Track already in playlist');
      }

      // Convert track to UnifiedTrack format
      const unifiedTrack: UnifiedTrack = 'source' in track ? track : wavlakeToUnified(track);

      // Filter out old metadata tags for other tracks
      const existingNonTrackTags = playlistEvent.tags.filter(tag =>
        !['r', 'track-title', 'track-artist', 'track-image', 'track-source', 'track-feed-id', 'track-media-url', 'track-url', 'track-duration'].includes(tag[0])
      );

      // Get existing track metadata tags
      const existingTrackMetadata = playlistEvent.tags.filter(tag =>
        ['r', 'track-title', 'track-artist', 'track-image', 'track-source', 'track-feed-id', 'track-media-url', 'track-url', 'track-duration'].includes(tag[0])
      );

      // Create new track tags with metadata
      const newTrackTags: string[][] = [
        ['r', trackUrl],
        ['track-title', trackUrl, unifiedTrack.title || ''],
        ['track-artist', trackUrl, unifiedTrack.artist || ''],
        ['track-image', trackUrl, unifiedTrack.albumArtUrl || ''],
        ['track-source', trackUrl, unifiedTrack.source || 'wavlake'],
        ['track-media-url', trackUrl, unifiedTrack.mediaUrl || ''],
        ['track-url', trackUrl, trackUrl],
        ['track-duration', trackUrl, String(unifiedTrack.duration || 0)],
      ];

      // Add feed ID for PodcastIndex tracks
      if (unifiedTrack.source === 'podcastindex' && unifiedTrack.feedId) {
        newTrackTags.push(['track-feed-id', trackUrl, String(unifiedTrack.feedId)]);
      }

      const newTags = [
        ...existingNonTrackTags,
        ...existingTrackMetadata,
        ...newTrackTags,
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

// Hook to like/unlike a track (add to/remove from Liked Songs and create reaction)
export function useLikeTrack() {
  const { nostr } = useNostr();
  const { mutate: createEvent } = useNostrPublish();
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();

  return useMutation({
    mutationFn: async ({ track, trackUrl }: {
      track: UnifiedTrack | WavlakeTrack;
      trackUrl: string;
    }) => {
      if (!user?.pubkey) throw new Error('User not logged in');

      // Try to get existing liked songs from cache first
      let existingLikedSongs = queryClient.getQueryData<NostrEvent | null>(['liked-songs', user.pubkey]);

      // If not in cache, fetch from relays
      if (!existingLikedSongs) {
        const signal = AbortSignal.timeout(3000);
        const events = await nostr.query([
          {
            kinds: [30003],
            authors: [user.pubkey],
            '#d': ['liked-songs'],
          }
        ], { signal });
        existingLikedSongs = events.sort((a, b) => b.created_at - a.created_at)[0] || null;
      }

      const existingTracks = existingLikedSongs?.tags
        .filter(tag => tag[0] === 'r')
        .map(tag => tag[1]) || [];

      const isCurrentlyLiked = existingTracks.includes(trackUrl);

      // Convert track to UnifiedTrack format
      const unifiedTrack: UnifiedTrack = 'source' in track ? track : wavlakeToUnified(track);

      if (isCurrentlyLiked) {
        // Unlike: Remove from liked songs - filter out all tags related to this URL
        const updatedTags = existingLikedSongs?.tags.filter(tag =>
          // Keep structural tags
          ['d', 'title', 'description', 't'].includes(tag[0]) ||
          // Keep track tags that don't match this URL
          (tag[0] === 'r' && tag[1] !== trackUrl) ||
          (['track-title', 'track-artist', 'track-image', 'track-source', 'track-feed-id', 'track-media-url', 'track-url', 'track-duration'].includes(tag[0]) && tag[1] !== trackUrl)
        ) || [];

        const tags = [
          ['d', 'liked-songs'],
          ['title', 'Liked Songs'],
          ['description', 'My favorite tracks'],
          ['t', 'music'],
          ...updatedTags.filter(tag => !['d', 'title', 'description', 't'].includes(tag[0])),
        ];

        createEvent({
          kind: 30003, // Bookmark sets
          content: '',
          tags,
        });

        // Find and delete the existing like reaction (NIP-09)
        const trackReactions = queryClient.getQueryData<{ likes: NostrEvent[] }>(['track-reactions', trackUrl]);

        const userLikeReaction = trackReactions?.likes.find(like => like.pubkey === user?.pubkey);

        if (userLikeReaction) {
          createEvent({
            kind: 5, // Event Deletion Request
            content: 'Unlike track',
            tags: [
              ['e', userLikeReaction.id], // Reference to the like reaction being deleted
              ['k', '7'], // Kind of the event being deleted (reaction)
            ],
          });
        }
      } else {
        // Like: Add to liked songs with track metadata
        const existingTags = existingLikedSongs?.tags.filter(tag =>
          !['d', 'title', 'description', 't'].includes(tag[0])
        ) || [];

        const newTrackTags: string[][] = [
          ['r', trackUrl],
          ['track-title', trackUrl, unifiedTrack.title || ''],
          ['track-artist', trackUrl, unifiedTrack.artist || ''],
          ['track-image', trackUrl, unifiedTrack.albumArtUrl || ''],
          ['track-source', trackUrl, unifiedTrack.source || 'wavlake'],
          ['track-media-url', trackUrl, unifiedTrack.mediaUrl || ''],
          ['track-url', trackUrl, trackUrl],
          ['track-duration', trackUrl, String(unifiedTrack.duration || 0)],
        ];

        // Add feed ID for PodcastIndex tracks
        if (unifiedTrack.source === 'podcastindex' && unifiedTrack.feedId) {
          newTrackTags.push(['track-feed-id', trackUrl, String(unifiedTrack.feedId)]);
        }

        const tags = [
          ['d', 'liked-songs'],
          ['title', 'Liked Songs'],
          ['description', 'My favorite tracks'],
          ['t', 'music'],
          ...existingTags,
          ...newTrackTags,
        ];

        createEvent({
          kind: 30003, // Bookmark sets
          content: '',
          tags,
        });

        // Create positive reaction
        createEvent({
          kind: 7, // Reaction
          content: '+', // Standard like content as per NIP-25
          tags: [
            ['r', trackUrl],
            ['k', '1'], // Reacting to a note-like content
          ],
        });
      }
    },
    onSuccess: (_, { trackUrl }) => {
      if (user?.pubkey) {
        queryClient.invalidateQueries({ queryKey: ['liked-songs', user.pubkey] });
        queryClient.invalidateQueries({ queryKey: ['track-reactions', trackUrl] });
        // Also invalidate social feed to show the new reaction
        queryClient.invalidateQueries({ queryKey: ['social-feed'] });
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
        content: '+', // Standard like content as per NIP-25
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
      track: UnifiedTrack | WavlakeTrack | { id: string; title: string; artist: string; duration: number };
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
      // Also invalidate social feed to show the new comment
      queryClient.invalidateQueries({ queryKey: ['social-feed'] });
    },
  });
}

// Hook to get playlist comments
export function usePlaylistComments(playlistEvent: NostrEvent | null) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['playlist-comments', playlistEvent?.id],
    queryFn: async (c) => {
      if (!playlistEvent) return [];

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);

      // Get the d tag (identifier) from the playlist
      const dTag = playlistEvent.tags.find(tag => tag[0] === 'd')?.[1];
      if (!dTag) return [];

      // Create the address reference for the playlist
      const addressRef = `30003:${playlistEvent.pubkey}:${dTag}`;

      const events = await nostr.query([
        {
          kinds: [1111], // Comment events
          '#A': [addressRef], // Root reference to the playlist
          limit: 50,
        }
      ], { signal });

      return events.sort((a, b) => b.created_at - a.created_at);
    },
    enabled: !!playlistEvent,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Hook to comment on a playlist
export function useCommentOnPlaylist() {
  const { mutate: createEvent } = useNostrPublish();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ content, playlistEvent }: {
      content: string;
      playlistEvent: NostrEvent;
    }) => {
      // Get the d tag (identifier) from the playlist
      const dTag = playlistEvent.tags.find(tag => tag[0] === 'd')?.[1];
      if (!dTag) {
        throw new Error('Invalid playlist: missing identifier');
      }

      // Create the address reference for the playlist
      const addressRef = `30003:${playlistEvent.pubkey}:${dTag}`;

      createEvent({
        kind: 1111, // Comment
        content,
        tags: [
          // Root references (uppercase)
          ['A', addressRef], // Address reference to the playlist
          ['K', '30003'], // Kind of the root content
          ['P', playlistEvent.pubkey], // Author of the root content
          // Parent references (lowercase) - same as root for top-level comments
          ['a', addressRef], // Address reference to the parent (same as root)
          ['k', '30003'], // Kind of the parent
          ['p', playlistEvent.pubkey], // Author of the parent
        ],
      });
    },
    onSuccess: (_, { playlistEvent }) => {
      queryClient.invalidateQueries({ queryKey: ['playlist-comments', playlistEvent.id] });
      // Also invalidate social feed to show the new comment
      queryClient.invalidateQueries({ queryKey: ['social-feed'] });
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
        // Also invalidate social feed to show the updated playlist
        queryClient.invalidateQueries({ queryKey: ['social-feed'] });
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

      // Remove the track and its metadata - filter out all tags related to this URL
      const updatedTags = playlistEvent.tags.filter(tag =>
        // Keep all tags that are not related to this specific track URL
        (tag[0] === 'r' && tag[1] !== trackUrl) ||
        (['track-title', 'track-artist', 'track-image', 'track-source', 'track-feed-id', 'track-media-url', 'track-url', 'track-duration'].includes(tag[0]) && tag[1] !== trackUrl) ||
        !['r', 'track-title', 'track-artist', 'track-image', 'track-source', 'track-feed-id', 'track-media-url', 'track-url', 'track-duration'].includes(tag[0])
      );

      createEvent({
        kind: 30003,
        content: playlistEvent.content,
        tags: updatedTags,
      });
    },
    onSuccess: () => {
      if (user?.pubkey) {
        queryClient.invalidateQueries({ queryKey: ['user-playlists', user.pubkey] });
      }
    },
  });
}

// Hook to remove track from liked songs
export function useRemoveFromLikedSongs() {
  const { mutate: createEvent } = useNostrPublish();
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();

  return useMutation({
    mutationFn: async ({ trackUrl }: { trackUrl: string }) => {
      // Get existing liked songs
      const likedSongsEvents = await queryClient.fetchQuery({
        queryKey: ['liked-songs', user?.pubkey],
      });

      const existingLikedSongs = likedSongsEvents as NostrEvent | null;
      if (!existingLikedSongs) {
        throw new Error('No liked songs found');
      }

      const existingTracks = existingLikedSongs.tags
        .filter(tag => tag[0] === 'r')
        .map(tag => tag[1]);

      if (!existingTracks.includes(trackUrl)) {
        throw new Error('Track not found in liked songs');
      }

      // Remove the track from liked songs - filter out all tags related to this URL
      const updatedTags = existingLikedSongs.tags.filter(tag =>
        // Keep structural tags
        ['d', 'title', 'description', 't'].includes(tag[0]) ||
        // Keep track tags that don't match this URL
        (tag[0] === 'r' && tag[1] !== trackUrl) ||
        (['track-title', 'track-artist', 'track-image', 'track-source', 'track-feed-id', 'track-media-url', 'track-url', 'track-duration'].includes(tag[0]) && tag[1] !== trackUrl)
      );

      const tags = [
        ['d', 'liked-songs'],
        ['title', 'Liked Songs'],
        ['description', 'My favorite tracks'],
        ['t', 'music'],
        ...updatedTags.filter(tag => !['d', 'title', 'description', 't'].includes(tag[0])),
      ];

      createEvent({
        kind: 30003, // Bookmark sets
        content: '',
        tags,
      });

      // Find and delete the existing like reaction (NIP-09)
      const trackReactions = await queryClient.fetchQuery({
        queryKey: ['track-reactions', trackUrl],
      });

      const userLikeReaction = (trackReactions as { likes: NostrEvent[] })?.likes.find(like => like.pubkey === user?.pubkey);

      if (userLikeReaction) {
        createEvent({
          kind: 5, // Event Deletion Request
          content: 'Unlike track',
          tags: [
            ['e', userLikeReaction.id], // Reference to the like reaction being deleted
            ['k', '7'], // Kind of the event being deleted (reaction)
          ],
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

// Hook to get note reactions (likes)
export function useNoteReactions(noteId: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['note-reactions', noteId],
    queryFn: async (c) => {
      if (!noteId) return { likes: [], likeCount: 0 };

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);

      const reactionEvents = await nostr.query([
        {
          kinds: [7], // Reactions
          '#e': [noteId],
          limit: 100,
        }
      ], { signal });

      // Get unique authors to scope deletion queries
      const authors = [...new Set(reactionEvents.map(e => e.pubkey))];

      const deletionEvents = authors.length > 0
        ? await nostr.query([{
            kinds: [5],
            authors,
            '#k': ['7'],
            limit: 100,
          }], { signal })
        : [];

      // Create a set of deleted event IDs
      const deletedEventIds = new Set(
        deletionEvents.flatMap(deletion =>
          deletion.tags
            .filter(tag => tag[0] === 'e')
            .map(tag => tag[1])
        )
      );

      const events = reactionEvents.filter(event => !deletedEventIds.has(event.id));
      const finalLikes = resolveLatestLikes(events);

      return {
        likes: finalLikes,
        likeCount: finalLikes.length,
      };
    },
    enabled: !!noteId,
    staleTime: 5 * 1000, // 5 seconds
    refetchOnWindowFocus: true,
  });
}

// Hook to like/unlike a note
export function useLikeNote() {
  const { mutate: createEvent } = useNostrPublish();
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();

  return useMutation({
    mutationFn: async ({ noteId, authorPubkey, wasLiked }: {
      noteId: string;
      authorPubkey: string;
      wasLiked: boolean;
    }) => {
      if (wasLiked) {
        // Unlike: Find the user's existing like reaction and delete it
        const currentReactions = queryClient.getQueryData(['note-reactions', noteId]) as { likes: NostrEvent[]; likeCount: number } | undefined;
        const userLikeReaction = currentReactions?.likes.find(like => like.pubkey === user?.pubkey);

        if (userLikeReaction) {
          // Create a deletion request for the like reaction (NIP-09)
          createEvent({
            kind: 5, // Event Deletion Request
            content: 'Unlike',
            tags: [
              ['e', userLikeReaction.id], // Reference to the like reaction being deleted
              ['k', '7'], // Kind of the event being deleted (reaction)
            ],
          });
        }
      } else {
        // Like: Create a positive reaction (NIP-25)
        createEvent({
          kind: 7, // Reaction
          content: '+', // Standard like content as per NIP-25
          tags: [
            ['e', noteId],
            ['p', authorPubkey],
            ['k', '1'], // Reacting to a text note
          ],
        });
      }

      return { noteId, authorPubkey, wasLiked };
    },
    onMutate: async ({ noteId }) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['note-reactions', noteId] });

      // Snapshot the previous value
      const previousReactions = queryClient.getQueryData(['note-reactions', noteId]) as { likes: NostrEvent[]; likeCount: number } | undefined;

      // Optimistically update to the new value
      if (previousReactions && user) {
        const userHasLiked = previousReactions.likes.some(like => like.pubkey === user.pubkey);

        if (userHasLiked) {
          // Remove user's like
          const updatedLikes = previousReactions.likes.filter(like => like.pubkey !== user.pubkey);
          queryClient.setQueryData(['note-reactions', noteId], {
            likes: updatedLikes,
            likeCount: updatedLikes.length,
          });
        } else {
          // Add user's like (create a mock reaction event)
          const mockReaction: NostrEvent = {
            id: `temp-${Date.now()}`,
            pubkey: user.pubkey,
            created_at: Math.floor(Date.now() / 1000),
            kind: 7,
            content: '❤️',
            tags: [['e', noteId]],
            sig: '',
          };
          const updatedLikes = [...previousReactions.likes, mockReaction];
          queryClient.setQueryData(['note-reactions', noteId], {
            likes: updatedLikes,
            likeCount: updatedLikes.length,
          });
        }
      }

      // Return a context object with the snapshotted value and the original like state
      return {
        previousReactions,
        userWasLiked: previousReactions?.likes.some(like => like.pubkey === user?.pubkey) || false
      };
    },
    onError: (err, { noteId }, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousReactions) {
        queryClient.setQueryData(['note-reactions', noteId], context.previousReactions);
      }
    },
    onSettled: (_, __, { noteId }) => {
      // Always refetch after error or success to ensure we have the latest data
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['note-reactions', noteId] });
      }, 1000); // Shorter delay since we have optimistic updates
    },
  });
}