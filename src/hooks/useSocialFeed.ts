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
            kinds: [1], // Text notes with track references (comments on tracks)
            authors: followedPubkeys,
            limit: Math.ceil(EVENTS_PER_PAGE * 0.4), // 40% of page
            until,
          },
          {
            kinds: [30003], // Bookmark sets (playlists)
            authors: followedPubkeys,
            '#t': ['music'], // Music playlists
            limit: Math.ceil(EVENTS_PER_PAGE * 0.25), // 25% of page
            until,
          },
          {
            kinds: [7], // Reactions on tracks
            authors: followedPubkeys,
            limit: Math.ceil(EVENTS_PER_PAGE * 0.25), // 25% of page
            until,
          },
          {
            kinds: [1111], // Playlist comments
            authors: followedPubkeys,
            limit: Math.ceil(EVENTS_PER_PAGE * 0.1), // 10% of page
            until,
          },
        ];
      } else {
        // Global feed - get recent music activity from everyone
        filters = [
          {
            kinds: [1], // Text notes with track references (comments on tracks)
            limit: Math.ceil(EVENTS_PER_PAGE * 0.4), // 40% of page
            until,
          },
          {
            kinds: [30003], // Bookmark sets (playlists)
            '#t': ['music'], // Music playlists
            limit: Math.ceil(EVENTS_PER_PAGE * 0.25), // 25% of page
            until,
          },
          {
            kinds: [7], // Reactions on tracks
            limit: Math.ceil(EVENTS_PER_PAGE * 0.25), // 25% of page
            until,
          },
          {
            kinds: [1111], // Playlist comments
            limit: Math.ceil(EVENTS_PER_PAGE * 0.1), // 10% of page
            until,
          },
        ];
      }

      // Execute all queries
      const allEvents: NostrEvent[] = [];
      for (const filter of filters) {
        try {
          const events = await nostr.query([filter], { signal });
          allEvents.push(...events);
        } catch (error) {
          console.error('Failed to fetch events for filter:', filter, error);
        }
      }

      // Filter and process events
      const musicEvents = allEvents.filter(event => {
        // For text notes, only include if they are explicitly music-related
        if (event.kind === 1) {
          // Direct track references (comments on tracks)
          const hasTrackReference = event.tags.some(tag =>
            tag[0] === 'r' && tag[1]?.includes('wavlake.com/track/')
          );

          // Music-related hashtags
          const hasMusicTags = event.tags.some(tag =>
            tag[0] === 't' && ['music', 'nowplaying', 'track', 'song', 'album', 'artist'].includes(tag[1]?.toLowerCase())
          );

          // Only include if explicitly music-related
          return hasTrackReference || hasMusicTags;
        }

        // For reactions, only include if they reference Wavlake tracks
        if (event.kind === 7) {
          return event.tags.some(tag =>
            tag[0] === 'r' && tag[1]?.includes('wavlake.com/track/')
          );
        }

        // For playlists, check if they have music tag and contain tracks
        if (event.kind === 30003) {
          const hasMusicTag = event.tags.some(tag => tag[0] === 't' && tag[1] === 'music');
          const hasTracks = event.tags.some(tag => tag[0] === 'r');
          return hasMusicTag && hasTracks;
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
      const nextCursor = pageEvents.length === EVENTS_PER_PAGE
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