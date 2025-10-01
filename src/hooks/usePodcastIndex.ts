import { useQuery } from '@tanstack/react-query';
import { podcastIndexAPI } from '@/lib/podcastindex';

export function usePodcastIndexSearch(term: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['podcastindex-search', term],
    queryFn: () => podcastIndexAPI.searchMusic(term),
    enabled: enabled && term.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function usePodcastIndexTop100() {
  return useQuery({
    queryKey: ['podcastindex-top100'],
    queryFn: () => podcastIndexAPI.getTop100Music(),
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

export function usePodcastIndexFeedEpisodes(feedId: number | undefined) {
  return useQuery({
    queryKey: ['podcastindex-episodes', feedId],
    queryFn: () => podcastIndexAPI.getFeedEpisodes(feedId!),
    enabled: !!feedId,
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
}
