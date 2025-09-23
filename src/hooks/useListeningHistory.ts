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

      // Create history items from each status update event
      const historyItemPromises = trackEvents.map(async (event) => {
        const trackUrls: string[] = [];

        // Get URLs from r tags
        event.tags.forEach(tag => {
          if (tag[0] === 'r' && tag[1]?.includes('wavlake.com/track/')) {
            trackUrls.push(tag[1]);
          }
        });

        // Extract URLs from content using regex
        const urlMatches = event.content.match(/https?:\/\/wavlake\.com\/track\/[^\s]+/g);
        if (urlMatches) {
          trackUrls.push(...urlMatches);
        }

        // Process the first track URL found in this event
        if (trackUrls.length > 0) {
          const trackId = trackUrls[0].split('/track/')[1]?.split(/[?#]/)[0];
          if (trackId) {
            try {
              const trackData = await wavlakeAPI.getTrack(trackId);
              const track = Array.isArray(trackData) ? trackData[0] : trackData;

              if (track) {
                return {
                  track,
                  event,
                  timestamp: event.created_at,
                } as ListeningHistoryItem;
              }
            } catch (error) {
              console.error('Failed to fetch track:', trackId, error);
            }
          }
        }
        return null;
      });

      const allHistoryItems = (await Promise.all(historyItemPromises))
        .filter((item): item is ListeningHistoryItem => item !== null);

      // Sort by timestamp (most recent first)
      const sortedItems = allHistoryItems.sort((a, b) => b.timestamp - a.timestamp);

      // Keep only the most recent play of each unique track (by track ID)
      const uniqueTrackMap = new Map<string, ListeningHistoryItem>();
      for (const item of sortedItems) {
        if (!uniqueTrackMap.has(item.track.id)) {
          uniqueTrackMap.set(item.track.id, item);
        }
      }

      // Since we only have one music status update at most, return that single track
      // The UI will fall back to showing top tracks if history is insufficient
      return Array.from(uniqueTrackMap.values()).slice(0, 6);
    },
    enabled: !!user?.pubkey,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}