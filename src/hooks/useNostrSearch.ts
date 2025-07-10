import { useQuery } from '@tanstack/react-query';
import { parseNostrSearch } from '@/lib/nostrSearch';

export function useNostrSearch(searchTerm: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['nostr-search', searchTerm],
    queryFn: async () => {
      if (!searchTerm.trim()) return [];
      return await parseNostrSearch(searchTerm);
    },
    enabled: enabled && searchTerm.trim().length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1, // Only retry once for NIP-05 resolution
  });
}