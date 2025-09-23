import { useParams, Link } from 'react-router-dom';
import { useWavlakeAlbum } from '@/hooks/useWavlake';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Play, Pause, Heart, MoreHorizontal } from 'lucide-react';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';

export function AlbumPage() {
  const { albumId } = useParams<{ albumId: string }>();
  const { data: albumData, isLoading, error } = useWavlakeAlbum(albumId);
  const { state, playTrack } = useMusicPlayer();

  // Handle case where API might return an array
  const album = Array.isArray(albumData) ? albumData[0] : albumData;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="relative h-[400px] overflow-hidden">
          <Skeleton className="w-full h-full" />
        </div>
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="space-y-4">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !album) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Album not found</h1>
          <p className="text-gray-400">The album you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const tracks = album.tracks || [];

  const handlePlayAlbum = () => {
    if (tracks.length > 0) {
      playTrack(tracks[0], tracks);
    }
  };

  const isAlbumPlaying = () => {
    if (!state.currentTrack) return false;
    return tracks.some(track => track.id === state.currentTrack?.id) && state.isPlaying;
  };


  // Calculate total duration
  const totalDuration = tracks.reduce((sum, track) => sum + (track.duration || 0), 0);
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours} hr ${minutes} min`;
    }
    return `${minutes} min`;
  };

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Hero Section with Album Art */}
      <div className="relative h-[400px] overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${album.albumArtUrl})`,
            filter: 'blur(20px) brightness(0.3)',
            transform: 'scale(1.1)'
          }}
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />

        {/* Album Info */}
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="max-w-7xl mx-auto flex items-end gap-6">
            {/* Album Cover */}
            <img
              src={album.albumArtUrl}
              alt={album.albumTitle}
              className="w-60 h-60 rounded-lg shadow-2xl flex-shrink-0"
            />

            {/* Album Details */}
            <div className="flex-1 pb-4">
              <p className="text-sm text-gray-300 mb-2">Album</p>
              <h1 className="text-5xl font-bold mb-4">{album.albumTitle}</h1>

              <div className="flex items-center gap-2 text-sm text-gray-300 mb-6">
                <Link
                  to={`/artist/${album.artistId}`}
                  className="hover:text-white transition-colors font-medium"
                >
                  {album.artist}
                </Link>
                <span>•</span>
                <span>{new Date().getFullYear()}</span>
                <span>•</span>
                <span>{tracks.length} songs, {formatDuration(totalDuration)}</span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-4">
                <Button
                  size="lg"
                  className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-full font-medium"
                  onClick={handlePlayAlbum}
                >
                  {isAlbumPlaying() ? (
                    <Pause className="h-5 w-5 mr-2" />
                  ) : (
                    <Play className="h-5 w-5 mr-2" />
                  )}
                  {isAlbumPlaying() ? 'Pause' : 'Play'}
                </Button>

                <Button
                  variant="ghost"
                  size="lg"
                  className="text-gray-400 hover:text-white p-3 rounded-full"
                >
                  <Heart className="h-6 w-6" />
                </Button>

                <Button
                  variant="ghost"
                  size="lg"
                  className="text-gray-400 hover:text-white p-3 rounded-full"
                >
                  <MoreHorizontal className="h-6 w-6" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Track List */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="space-y-2">
          {tracks.map((track, index) => (
            <div
              key={track.id}
              className="flex items-center p-3 rounded-lg hover:bg-gray-900/50 transition-colors group cursor-pointer"
              onClick={() => playTrack(track, tracks)}
            >
              {/* Track Number / Play Button */}
              <div className="w-8 flex items-center justify-center mr-4">
                <span className="text-gray-400 group-hover:hidden text-sm">
                  {index + 1}
                </span>
                <Play className="h-4 w-4 text-white hidden group-hover:block" />
              </div>

              {/* Track Info */}
              <div className="flex-1 min-w-0">
                <div className="text-white font-medium truncate">
                  {track.title}
                </div>
                <div className="text-gray-400 text-sm truncate">
                  {track.artist}
                </div>
              </div>

              {/* Sats Earned */}
              <div className="text-gray-400 text-sm mr-4 hidden md:block">
                {track.msatTotal ? `${Math.floor(parseInt(track.msatTotal) / 1000)} sats` : '--'}
              </div>

              {/* Actions */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 mr-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white p-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Like track action
                  }}
                >
                  <Heart className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white p-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    // More actions menu
                  }}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>

              {/* Duration */}
              <div className="text-gray-400 text-sm w-12 text-right">
                {track.duration ? `${Math.floor(track.duration / 60)}:${(track.duration % 60).toString().padStart(2, '0')}` : '--:--'}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}