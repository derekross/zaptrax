import { useQuery } from '@tanstack/react-query';
import { wavlakeAPI } from '@/lib/wavlake';

export function useWavlakeSearch(term: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['wavlake-search', term],
    queryFn: () => wavlakeAPI.searchContent(term),
    enabled: enabled && term.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useWavlakeRankings(params: {
  sort: 'sats';
  days?: number;
  startDate?: string;
  endDate?: string;
  genre?: string;
  limit?: number;
} = { sort: 'sats', days: 7, limit: 50 }) {
  return useQuery({
    queryKey: ['wavlake-rankings', params],
    queryFn: () => wavlakeAPI.getRankings(params),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useWavlakeTrack(trackId: string | undefined) {
  return useQuery({
    queryKey: ['wavlake-track', trackId],
    queryFn: () => wavlakeAPI.getTrack(trackId!),
    enabled: !!trackId,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

export function useWavlakeArtist(artistId: string | undefined) {
  return useQuery({
    queryKey: ['wavlake-artist', artistId],
    queryFn: () => wavlakeAPI.getArtist(artistId!),
    enabled: !!artistId,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

export function useWavlakeAlbum(albumId: string | undefined) {
  return useQuery({
    queryKey: ['wavlake-album', albumId],
    queryFn: () => wavlakeAPI.getAlbum(albumId!),
    enabled: !!albumId,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

export function useWavlakeRadioTracks(genre: string | undefined, enabled: boolean = true) {
  return useQuery({
    queryKey: ['wavlake-radio', genre],
    queryFn: async () => {
      if (!genre) return [];

      // Fetch a larger set of tracks from the genre and shuffle them
      const tracks = await wavlakeAPI.getRankings({
        sort: 'sats',
        genre: genre.toLowerCase(),
        limit: 50, // Reduced limit for better performance
      });

      // Shuffle the tracks for radio-style random playback
      return tracks.sort(() => Math.random() - 0.5);
    },
    enabled: enabled && !!genre,
    staleTime: 15 * 60 * 1000, // 15 minutes - shorter stale time for radio content
  });
}