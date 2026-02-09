import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { wavlakeAPI } from '@/lib/wavlake';
import type { NostrEvent } from '@nostrify/nostrify';
import type { WavlakeTrack } from '@/lib/wavlake';

interface ListeningHistoryItem {
  track: WavlakeTrack;
  event: NostrEvent;
  timestamp: number;
}

export function useListeningHistory() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();

  return useQuery({
    queryKey: ['listening-history', user?.pubkey],
    queryFn: async (c) => {
      if (!user?.pubkey) return [];

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);

      // Query for the user's music status updates (kind 30315 with d tag 'music')
      const musicStatusEvents = await nostr.query([
        {
          kinds: [30315], // Status updates
          authors: [user.pubkey],
          '#d': ['music'], // Filter for music status updates
          limit: 50,
        }
      ], { signal });

      // These events should contain Wavlake track references
      const trackEvents = musicStatusEvents.filter(event => {
        // Check for Wavlake track references in r tags
        const hasTrackReference = event.tags.some(tag =>
          tag[0] === 'r' && tag[1]?.includes('wavlake.com/track/')
        );

        // Check for Wavlake URLs in content
        const hasWavlakeInContent = event.content.includes('wavlake.com/track/');

        return hasTrackReference || hasWavlakeInContent;
      });

      // Extract unique track IDs from events, deduplicate early
      const trackIdToEvent = new Map<string, NostrEvent>();
      for (const event of trackEvents.sort((a, b) => b.created_at - a.created_at)) {
        // Get URLs from r tags
        for (const tag of event.tags) {
          if (tag[0] === 'r' && tag[1]?.includes('wavlake.com/track/')) {
            const trackId = tag[1].split('/track/')[1]?.split(/[?#]/)[0];
            if (trackId && !trackIdToEvent.has(trackId)) {
              trackIdToEvent.set(trackId, event);
            }
          }
        }
        // Extract URLs from content
        const urlMatches = event.content.match(/https?:\/\/wavlake\.com\/track\/[^\s]+/g);
        if (urlMatches) {
          for (const url of urlMatches) {
            const trackId = url.split('/track/')[1]?.split(/[?#]/)[0];
            if (trackId && !trackIdToEvent.has(trackId)) {
              trackIdToEvent.set(trackId, event);
            }
          }
        }
        // Stop early once we have enough unique tracks
        if (trackIdToEvent.size >= 6) break;
      }

      // Fetch only the unique tracks we need (max 6 parallel requests)
      const entries = Array.from(trackIdToEvent.entries()).slice(0, 6);
      const results = await Promise.allSettled(
        entries.map(async ([trackId, event]) => {
          const trackData = await wavlakeAPI.getTrack(trackId);
          const track = Array.isArray(trackData) ? trackData[0] : trackData;
          if (!track) return null;
          return { track, event, timestamp: event.created_at } as ListeningHistoryItem;
        })
      );

      return results
        .filter((r): r is PromiseFulfilledResult<ListeningHistoryItem> =>
          r.status === 'fulfilled' && r.value !== null
        )
        .map(r => r.value);
    },
    enabled: !!user?.pubkey,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}