import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import type { NostrEvent } from '@nostrify/nostrify';

const EVENTS_PER_PAGE = 20;

export function useSocialFeed(feedType: 'following' | 'global') {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();

  return useInfiniteQuery({
    queryKey: ['social-feed', feedType, user?.pubkey],
    queryFn: async ({ pageParam, signal: querySignal }) => {
      const signal = AbortSignal.any([querySignal, AbortSignal.timeout(5000)]);
      const until = pageParam as number | undefined;

      let filters: Array<{
        kinds: number[];
        authors?: string[];
        '#t'?: string[];
        '#r'?: string[];
        '#d'?: string[];
        limit: number;
        until?: number;
      }> = [];

      if (feedType === 'following' && user?.pubkey) {
        // First, get the user's contact list to find who they follow
        const contactEvents = await nostr.query([
          {
            kinds: [3], // Contact list
            authors: [user.pubkey],
            limit: 1,
          }
        ], { signal });

        const latestContactList = contactEvents.sort((a, b) => b.created_at - a.created_at)[0];
        const followedPubkeys = latestContactList?.tags
          .filter(tag => tag[0] === 'p')
          .map(tag => tag[1]) || [];

        if (followedPubkeys.length === 0) {
          return { events: [], nextCursor: undefined }; // No one to follow
        }

        // Query for music-related activity from followed users
        filters = [
          {
            kinds: [1], // Text notes with music hashtags
            authors: followedPubkeys,
            '#t': ['music', 'nowplaying', 'track', 'song', 'album', 'artist', 'tunestr'],
            limit: 50, // Increased limit
            until,
          },
          {
            kinds: [1], // All text notes from followed users (to catch r tags)
            authors: followedPubkeys,
            limit: 100, // Increased limit to catch more potential music content
            until,
          },
          {
            kinds: [30003], // Bookmark sets (playlists and liked songs)
            authors: followedPubkeys,
            '#d': ['liked-songs'], // Specifically get liked-songs updates
            limit: 50,
            until,
          },
          {
            kinds: [30003], // All bookmark sets (including other playlists)
            authors: followedPubkeys,
            limit: 50,
            until,
          },
          {
            kinds: [7], // Reactions on tracks
            authors: followedPubkeys,
            limit: 50,
            until,
          },
          {
            kinds: [1111], // Playlist comments
            authors: followedPubkeys,
            limit: 20,
            until,
          },
        ];
      } else {
        // Global feed - get recent music activity from everyone
        filters = [
          {
            kinds: [1], // Text notes with music hashtags
            '#t': ['music', 'nowplaying', 'track', 'song', 'album', 'artist', 'tunestr'],
            limit: 50, // Increased limit
            until,
          },
          {
            kinds: [1], // All text notes (to catch r tags)
            limit: 100, // Increased limit to catch more potential music content
            until,
          },
          {
            kinds: [30003], // Bookmark sets (playlists and liked songs)
            '#d': ['liked-songs'], // Specifically get liked-songs updates
            limit: 50,
            until,
          },
          {
            kinds: [30003], // All bookmark sets
            limit: 50,
            until,
          },
          {
            kinds: [7], // Reactions on tracks
            limit: 50,
            until,
          },
          {
            kinds: [1111], // Playlist comments
            limit: 20,
            until,
          },
        ];
      }

      // Execute all queries in parallel for better performance
      const results = await Promise.allSettled(
        filters.map(filter => nostr.query([filter], { signal }))
      );
      const allEvents: NostrEvent[] = results
        .filter((r): r is PromiseFulfilledResult<NostrEvent[]> => r.status === 'fulfilled')
        .flatMap(r => r.value);

      // Filter and process events
      const musicEvents = allEvents.filter(event => {
        // For text notes, include if they have music hashtags (already filtered by relay)
        // OR if they have Wavlake track references
        if (event.kind === 1) {
          // Direct track references in r tags
          const hasTrackReference = event.tags.some(tag =>
            tag[0] === 'r' && tag[1]?.includes('wavlake.com/track/')
          );

          // Wavlake URLs in content
          const hasWavlakeInContent = event.content.includes('wavlake.com/track/');

          // Music-related hashtags (already filtered by relay, but double-check)
          const hasMusicTags = event.tags.some(tag =>
            tag[0] === 't' && ['music', 'nowplaying', 'track', 'song', 'album', 'artist', 'tunestr'].includes(tag[1]?.toLowerCase())
          );

          // Include if it has music tags OR Wavlake references (in tags or content)
          return hasTrackReference || hasWavlakeInContent || hasMusicTags;
        }

        // For reactions, only include if they reference Wavlake tracks
        if (event.kind === 7) {
          return event.tags.some(tag =>
            tag[0] === 'r' && tag[1]?.includes('wavlake.com/track/')
          );
        }

        // For playlists, check if they have music tag OR 'd' tag starts with 'playlist-' OR is 'liked-songs'
        if (event.kind === 30003) {
          const hasMusicTag = event.tags.some(tag => tag[0] === 't' && tag[1] === 'music');
          const hasPlaylistDTag = event.tags.some(tag =>
            tag[0] === 'd' && (tag[1]?.startsWith('playlist-') || tag[1] === 'liked-songs')
          );
          // Also check if it contains wavlake tracks
          const hasWavlakeTracks = event.tags.some(tag =>
            tag[0] === 'r' && tag[1]?.includes('wavlake.com/track/')
          );
          return hasMusicTag || hasPlaylistDTag || hasWavlakeTracks;
        }

        // For playlist comments, check if they reference a music playlist
        if (event.kind === 1111) {
          // Check if it has an 'A' tag referencing a 30003 (playlist) event
          return event.tags.some(tag =>
            tag[0] === 'A' && tag[1]?.startsWith('30003:')
          );
        }

        return false;
      });

      // Remove duplicates and sort by creation time
      const uniqueEvents = Array.from(
        new Map(musicEvents.map(event => [event.id, event])).values()
      );

      const sortedEvents = uniqueEvents.sort((a, b) => b.created_at - a.created_at);

      // Take only the requested number of events
      const pageEvents = sortedEvents.slice(0, EVENTS_PER_PAGE);

      // Determine next cursor (oldest event timestamp)
      // Always provide a cursor if we have events, unless we got significantly fewer than requested
      const nextCursor = pageEvents.length > 0 && pageEvents.length >= Math.min(EVENTS_PER_PAGE, 5)
        ? pageEvents[pageEvents.length - 1].created_at
        : undefined;

      return {
        events: pageEvents,
        nextCursor,
      };
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: feedType === 'global' || (feedType === 'following' && !!user?.pubkey),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

// Hook to get user's contact list (who they follow)
export function useContactList(pubkey?: string) {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const targetPubkey = pubkey || user?.pubkey;

  return useQuery({
    queryKey: ['contact-list', targetPubkey],
    queryFn: async (c) => {
      if (!targetPubkey) return null;

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      const events = await nostr.query([
        {
          kinds: [3], // Contact list
          authors: [targetPubkey],
          limit: 1,
        }
      ], { signal });

      const latestContactList = events.sort((a, b) => b.created_at - a.created_at)[0];

      if (!latestContactList) return null;

      const followedPubkeys = latestContactList.tags
        .filter(tag => tag[0] === 'p')
        .map(tag => tag[1]);

      return {
        event: latestContactList,
        following: followedPubkeys,
        followingCount: followedPubkeys.length,
      };
    },
    enabled: !!targetPubkey,
    staleTime: 60 * 1000, // 1 minute
  });
}