import { useQueries } from '@tanstack/react-query';
import { wavlakeAPI } from '@/lib/wavlake';
import { useWavlakeArtist } from './useWavlake';

export function useWavlakeArtistTracks(artistId: string | undefined) {
  const { data: artist, isLoading: isArtistLoading } = useWavlakeArtist(artistId);

  const albumIds = artist?.albums.map(album => album.id) || [];

  const albumQueries = useQueries({
    queries: albumIds.map(albumId => ({
      queryKey: ['wavlake-album', albumId],
      queryFn: () => wavlakeAPI.getAlbum(albumId),
      enabled: !!artistId,
      staleTime: 30 * 60 * 1000, // 30 minutes
    })),
  });

  const allTracks = albumQueries
    .flatMap(query => query.data?.tracks || [])
    .sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());

  const isLoading = isArtistLoading || albumQueries.some(query => query.isLoading);

  return { data: allTracks, isLoading };
}
