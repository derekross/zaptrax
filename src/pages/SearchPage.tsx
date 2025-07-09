import { useNavigate } from 'react-router-dom';
import { MusicSearch } from '@/components/music/MusicSearch';
import type { WavlakeSearchResult } from '@/lib/wavlake';

export function SearchPage() {
  const navigate = useNavigate();

  const handleArtistSelect = (result: WavlakeSearchResult) => {
    if (result.type === 'artist') {
      navigate(`/artist/${result.id}`);
    }
  };

  const handleAlbumSelect = (result: WavlakeSearchResult) => {
    if (result.type === 'album') {
      navigate(`/album/${result.id}`);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-punk font-black tracking-wider text-primary torn-edge">
          SEARCH
        </h1>
        <p className="text-accent font-metal">
          Discover tracks, artists, and albums
        </p>
      </div>
      
      <MusicSearch
        onArtistSelect={handleArtistSelect}
        onAlbumSelect={handleAlbumSelect}
      />
    </div>
  );
} 