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

      // Extract track URLs and fetch track data
      const trackUrls: string[] = [];

      trackEvents.forEach(event => {
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
      });

      // Remove duplicates and get track IDs
      const uniqueUrls = [...new Set(trackUrls)];
      const trackIds = uniqueUrls.map(url => url.split('/track/')[1]?.split(/[?#]/)[0]).filter(Boolean);

      // Fetch track data from Wavlake API
      const trackDataPromises = trackIds.map(async (trackId) => {
        try {
          const trackData = await wavlakeAPI.getTrack(trackId);
          const track = Array.isArray(trackData) ? trackData[0] : trackData;

          // Find the most recent event that referenced this track
          const relevantEvent = trackEvents.find(event => {
            const hasInTags = event.tags.some(tag =>
              tag[0] === 'r' && tag[1]?.includes(`/track/${trackId}`)
            );
            const hasInContent = event.content.includes(`/track/${trackId}`);
            return hasInTags || hasInContent;
          });

          if (track && relevantEvent) {
            return {
              track,
              event: relevantEvent,
              timestamp: relevantEvent.created_at,
            } as ListeningHistoryItem;
          }
        } catch (error) {
          console.error('Failed to fetch track:', trackId, error);
        }
        return null;
      });

      const historyItems = (await Promise.all(trackDataPromises))
        .filter((item): item is ListeningHistoryItem => item !== null);

      // Sort by timestamp (most recent first) - keep all plays including duplicates
      return historyItems.sort((a, b) => b.timestamp - a.timestamp);
    },
    enabled: !!user?.pubkey,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}