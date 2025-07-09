import { useParams } from 'react-router-dom';
import { useWavlakeArtist } from '@/hooks/useWavlake';

import { useWavlakeArtistTracks } from '@/hooks/useWavlakeArtistTracks';
import { TrackCard } from '@/components/music/TrackCard';

export function ArtistPage() {
  const { artistId } = useParams<{ artistId: string }>();
  const { data: artist, isLoading: artistLoading } = useWavlakeArtist(artistId);
  const { data: tracks, isLoading: tracksLoading } = useWavlakeArtistTracks(artistId);

  const isLoading = artistLoading || tracksLoading;

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!artist) {
    return <div>Artist not found</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center space-x-4 mb-8">
        <img src={artist.artistArtUrl} alt={artist.name} className="w-32 h-32 rounded-full" />
        <div>
          <h1 className="text-4xl font-bold">{artist.name}</h1>
          <p className="text-lg text-muted-foreground">{artist.bio}</p>
        </div>
      </div>

      <div className="space-y-4">
        {tracks.map(track => (
          <TrackCard key={track.id} track={track} queue={tracks} />
        ))}
      </div>
    </div>
  );
}
