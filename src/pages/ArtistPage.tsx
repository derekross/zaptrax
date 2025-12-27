import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWavlakeArtist, useWavlakeRadioTracks } from '@/hooks/useWavlake';
import { useWavlakeArtistTracks } from '@/hooks/useWavlakeArtistTracks';
import { useAuthor } from '@/hooks/useAuthor';
import { Button } from '@/components/ui/button';
import { Disc, Play, Pause } from 'lucide-react';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import type { WavlakeTrack } from '@/lib/wavlake';

export function ArtistPage() {
  const { artistId } = useParams<{ artistId: string }>();
  const navigate = useNavigate();
  const { data: artist, isLoading: artistLoading } = useWavlakeArtist(artistId);
  const { data: tracks, isLoading: tracksLoading } = useWavlakeArtistTracks(artistId);
  const { state, playTrack } = useMusicPlayer();

  const [showAllTracks, setShowAllTracks] = useState(false);
  const [showAllAlbums, setShowAllAlbums] = useState(false);

  // Use a default genre for radio functionality since tracks don't include genre data
  // We'll use 'rock' as a popular default genre for radio
  const radioGenre = 'rock';
  const { data: radioTracks } = useWavlakeRadioTracks(radioGenre);

  // Find npub if present
  const npub = artist?.artistNpub;
  const author = useAuthor(npub);

  const isLoading = artistLoading || tracksLoading;

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!artist) {
    return <div>Artist not found</div>;
  }

  // Nostr profile info
  const nostrProfile = author?.data?.metadata;

  // Group tracks by album
  const tracksByAlbum = tracks.reduce((acc, track) => {
    const albumId = track.albumId;
    if (!acc[albumId]) {
      acc[albumId] = [];
    }
    acc[albumId].push(track);
    return acc;
  }, {} as Record<string, typeof tracks>);

  // Get unique albums with their tracks
  const albums = Object.entries(tracksByAlbum).map(([albumId, albumTracks]) => {
    const firstTrack = albumTracks[0];
    return {
      id: albumId,
      title: firstTrack.albumTitle,
      albumArtUrl: firstTrack.albumArtUrl,
      trackCount: albumTracks.length,
      tracks: albumTracks,
    };
  });

  const handleAlbumPlay = (albumTracks: WavlakeTrack[], event: React.MouseEvent) => {
    event.stopPropagation();
    if (albumTracks.length > 0) {
      playTrack(albumTracks[0], albumTracks);
    }
  };

  const isAlbumPlaying = (albumTracks: WavlakeTrack[]) => {
    if (!state.currentTrack) return false;
    return albumTracks.some(track => track.id === state.currentTrack?.id) && state.isPlaying;
  };

  const handleAlbumClick = (albumId: string) => {
    navigate(`/album/${albumId}`);
  };


  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Hero Section with Background Image */}
      <div className="relative h-[300px] md:h-[400px] overflow-hidden" style={{ marginTop: 'calc(-1 * env(safe-area-inset-top, 0px))', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${artist.artistArtUrl})`,
            filter: 'blur(20px) brightness(0.4)',
            transform: 'scale(1.1)'
          }}
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />

        {/* Artist Info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-2 md:mb-4">{artist.name}</h1>
            <p className="text-sm md:text-lg text-gray-300 mb-4 md:mb-6 max-w-2xl line-clamp-2 md:line-clamp-none">
              {artist.bio || nostrProfile?.about || 'Artist on ZapTrax'}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
              <Button
                size="lg"
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 md:px-8 py-2 md:py-3 rounded-full font-medium w-full sm:w-auto"
                onClick={() => {
                  if (tracks.length > 0) {
                    // Create a shuffled copy of the tracks array
                    const shuffledTracks = [...tracks].sort(() => Math.random() - 0.5);
                    playTrack(shuffledTracks[0], shuffledTracks);
                  }
                }}
              >
                <Play className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                Shuffle
              </Button>

              <Button
                variant="outline"
                size="lg"
                className="border-gray-600 text-white hover:bg-gray-800 px-4 md:px-6 py-2 md:py-3 rounded-full w-full sm:w-auto"
                onClick={() => {
                  if (radioTracks && radioTracks.length > 0) {
                    // If artist has tracks, start with one of their tracks, otherwise start with radio
                    if (tracks && tracks.length > 0) {
                      const firstTrack = tracks[0];
                      const radioPlaylist = [firstTrack, ...radioTracks.slice(0, 49)];
                      playTrack(firstTrack, radioPlaylist);
                    } else {
                      // Just play radio tracks if artist has no tracks
                      playTrack(radioTracks[0], radioTracks);
                    }
                  }
                }}
                disabled={!radioTracks || radioTracks.length === 0}
              >
                <Disc className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                Radio
              </Button>

              {npub && (
                <Button
                  variant="outline"
                  size="lg"
                  className="border-gray-600 text-white hover:bg-gray-800 px-4 md:px-6 py-2 md:py-3 rounded-full w-full sm:w-auto"
                >
                  Follow
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8">
        {/* Top Songs Section */}
        {tracks.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6">Top songs</h2>
            <div className="space-y-2">
              {tracks
                .sort((a, b) => {
                  const aSats = parseInt(a.msatTotal || '0');
                  const bSats = parseInt(b.msatTotal || '0');
                  return bSats - aSats; // Sort descending by sats
                })
                .slice(0, showAllTracks ? tracks.length : 5)
                .map((track, index) => (
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

                  {/* Album Art */}
                  <img
                    src={track.albumArtUrl}
                    alt={track.albumTitle}
                    className="w-12 h-12 rounded mr-4"
                  />

                  {/* Track Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium truncate">
                      {track.title}
                    </div>
                    <div
                      className="text-gray-400 text-sm truncate hover:text-purple-400 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent track play
                        handleAlbumClick(track.albumId);
                      }}
                    >
                      {track.albumTitle}
                    </div>
                  </div>

                  {/* Sats Earned */}
                  <div className="text-gray-400 text-sm mr-4">
                    {track.msatTotal ? `${Math.floor(parseInt(track.msatTotal) / 1000)} sats` : '--'}
                  </div>

                  {/* Duration */}
                  <div className="text-gray-400 text-sm w-12 text-right">
                    {track.duration ? `${Math.floor(track.duration / 60)}:${(track.duration % 60).toString().padStart(2, '0')}` : '--:--'}
                  </div>
                </div>
              ))}
            </div>

            {tracks.length > 5 && (
              <Button
                variant="ghost"
                className="text-gray-400 hover:text-purple-400 hover:bg-purple-900/20 mt-4"
                onClick={() => setShowAllTracks(!showAllTracks)}
              >
                {showAllTracks ? 'Show less' : 'Show all'}
              </Button>
            )}
          </div>
        )}

        {/* Albums Section */}
        {albums.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Albums</h2>
              {albums.length > 6 && (
                <Button
                  variant="ghost"
                  className="text-gray-400 hover:text-purple-400 hover:bg-purple-900/20"
                  onClick={() => setShowAllAlbums(!showAllAlbums)}
                >
                  {showAllAlbums ? 'Show less' : 'Show all'}
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
              {albums.slice(0, showAllAlbums ? albums.length : 6).map((album) => (
                <div
                  key={album.id}
                  className="group cursor-pointer"
                  onClick={() => handleAlbumClick(album.id)}
                >
                  <div className="relative mb-3">
                    <img
                      src={album.albumArtUrl}
                      alt={album.title}
                      className="w-full aspect-square object-cover rounded-lg"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                      <Button
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700 text-white rounded-full"
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent album navigation
                          handleAlbumPlay(album.tracks, e);
                        }}
                      >
                        {isAlbumPlaying(album.tracks) ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-white font-medium text-sm truncate">
                      {album.title}
                    </h3>
                    <p className="text-gray-400 text-xs">
                      {new Date().getFullYear()} • Album
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}