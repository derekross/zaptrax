import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Play, ChevronRight, Disc3, ListMusic } from 'lucide-react';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import {
  useNostrMusicTracks,
  useNostrMusicPlaylists,
  getNostrTrackNaddr,
  getNostrPlaylistNaddr,
} from '@/hooks/useNostrMusicTracks';
import { nostrTrackToUnified, type NostrMusicTrack } from '@/lib/unifiedTrack';

export function NostrMusicSection() {
  const [showAllTracks, setShowAllTracks] = useState(false);
  const [showAllPlaylists, setShowAllPlaylists] = useState(false);
  const navigate = useNavigate();
  const { playTrack } = useMusicPlayer();

  const { data: nostrTracks, isLoading: isTracksLoading, error: tracksError } = useNostrMusicTracks(50);
  const { data: nostrPlaylists, isLoading: isPlaylistsLoading } = useNostrMusicPlaylists(undefined, 20);

  const handleTrackPlay = (track: NostrMusicTrack, allTracks: NostrMusicTrack[]) => {
    const unifiedTrack = nostrTrackToUnified(track);
    const unifiedQueue = allTracks.map(nostrTrackToUnified);
    playTrack(unifiedTrack, unifiedQueue);
  };

  const handleTrackClick = (track: NostrMusicTrack) => {
    const naddr = getNostrTrackNaddr(track);
    navigate(`/track/${naddr}`);
  };

  const handleArtistClick = (e: React.MouseEvent, pubkey: string) => {
    e.stopPropagation();
    const npub = nip19.npubEncode(pubkey);
    navigate(`/profile/${npub}`);
  };

  const handlePlaylistClick = (playlist: { event: { pubkey: string }; d: string }) => {
    const naddr = getNostrPlaylistNaddr(playlist as Parameters<typeof getNostrPlaylistNaddr>[0]);
    navigate(`/nostr-playlist/${naddr}`);
  };

  // Don't render if no tracks and no playlists
  if (!isTracksLoading && !isPlaylistsLoading && (!nostrTracks || nostrTracks.length === 0) && (!nostrPlaylists || nostrPlaylists.length === 0)) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Nostr Music Tracks Section */}
      {(nostrTracks && nostrTracks.length > 0) && (
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Disc3 className="h-6 w-6 text-purple-500" />
              Nostr Music
              <span className="text-lg font-normal text-gray-400 ml-2">
                Native Tracks
              </span>
            </h2>
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-purple-400 hover:bg-purple-900/20 transition-colors"
              onClick={() => setShowAllTracks(true)}
            >
              More
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {(showAllTracks ? nostrTracks : nostrTracks.slice(0, 12)).map((track) => (
              <Card
                key={`nostr-${track.event.id}`}
                className="bg-gray-900 border-gray-800 hover:bg-gray-800 transition-colors cursor-pointer"
                onClick={() => handleTrackClick(track)}
              >
                <CardContent className="p-0">
                  <div className="relative group">
                    {track.image ? (
                      <img
                        src={track.image}
                        alt={track.title}
                        className="w-full aspect-square object-cover rounded-t-lg"
                      />
                    ) : (
                      <div className="w-full aspect-square bg-gradient-to-br from-purple-600 to-purple-900 rounded-t-lg flex items-center justify-center">
                        <Disc3 className="h-12 w-12 text-white/60" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-t-lg flex items-center justify-center">
                      <Button
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700 text-white rounded-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTrackPlay(track, nostrTracks);
                        }}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    </div>
                    {/* Nostr badge */}
                    <div className="absolute top-2 right-2 bg-purple-600/90 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                      Nostr
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-white font-medium text-sm truncate">{track.title}</p>
                    <p
                      className="text-gray-400 text-xs truncate hover:text-purple-400 cursor-pointer transition-colors"
                      onClick={(e) => handleArtistClick(e, track.event.pubkey)}
                    >
                      {track.artist}
                    </p>
                    {track.album && (
                      <p className="text-gray-500 text-xs truncate mt-0.5">{track.album}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Show Less Button */}
          {showAllTracks && (
            <div className="flex justify-center mt-6">
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-purple-400 hover:bg-purple-900/20 transition-colors"
                onClick={() => setShowAllTracks(false)}
              >
                Show Less
                <ChevronRight className="h-4 w-4 ml-1 rotate-90" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Loading State for Tracks */}
      {isTracksLoading && (
        <div className="px-6 py-4">
          <div className="flex items-center mb-6">
            <Disc3 className="h-6 w-6 text-purple-500 mr-2" />
            <h2 className="text-2xl font-bold text-white">Nostr Music</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="bg-gray-900 border-gray-800">
                <CardContent className="p-0">
                  <div className="w-full aspect-square bg-gray-800 animate-pulse rounded-t-lg" />
                  <div className="p-3 space-y-2">
                    <div className="h-4 bg-gray-800 animate-pulse rounded" />
                    <div className="h-3 bg-gray-800 animate-pulse rounded w-3/4" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Error State for Tracks */}
      {tracksError && (
        <div className="px-6 py-4">
          <Card className="bg-gray-900 border-red-800">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Disc3 className="h-6 w-6 text-red-500" />
                <div>
                  <h3 className="font-semibold text-white">Failed to load Nostr Music</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    {tracksError.message || 'Unknown error occurred'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Nostr Music Playlists Section */}
      {nostrPlaylists && nostrPlaylists.length > 0 && (
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <ListMusic className="h-6 w-6 text-purple-500" />
              Nostr Playlists
            </h2>
            {nostrPlaylists.length > 6 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-purple-400 hover:bg-purple-900/20 transition-colors"
                onClick={() => setShowAllPlaylists(!showAllPlaylists)}
              >
                {showAllPlaylists ? 'Show Less' : 'More'}
                <ChevronRight className={`h-4 w-4 ml-1 ${showAllPlaylists ? 'rotate-90' : ''}`} />
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {(showAllPlaylists ? nostrPlaylists : nostrPlaylists.slice(0, 6)).map((playlist) => (
              <Card
                key={`playlist-${playlist.event.id}`}
                className="bg-gray-900 border-gray-800 hover:bg-gray-800 transition-colors cursor-pointer"
                onClick={() => handlePlaylistClick(playlist)}
              >
                <CardContent className="p-0">
                  <div className="relative group">
                    {playlist.image ? (
                      <img
                        src={playlist.image}
                        alt={playlist.title}
                        className="w-full aspect-square object-cover rounded-t-lg"
                      />
                    ) : (
                      <div className="w-full aspect-square bg-gradient-to-br from-purple-600 to-purple-800 rounded-t-lg flex items-center justify-center">
                        <ListMusic className="h-12 w-12 text-white/60" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-t-lg flex items-center justify-center">
                      <Button
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700 text-white rounded-full"
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-white font-medium text-sm truncate">{playlist.title}</p>
                    <p className="text-gray-400 text-xs truncate">
                      {playlist.trackRefs.length} tracks
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Loading State for Playlists */}
      {isPlaylistsLoading && (
        <div className="px-6 py-4">
          <div className="flex items-center mb-6">
            <ListMusic className="h-6 w-6 text-purple-500 mr-2" />
            <h2 className="text-2xl font-bold text-white">Nostr Playlists</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="bg-gray-900 border-gray-800">
                <CardContent className="p-0">
                  <div className="w-full aspect-square bg-gray-800 animate-pulse rounded-t-lg" />
                  <div className="p-3 space-y-2">
                    <div className="h-4 bg-gray-800 animate-pulse rounded" />
                    <div className="h-3 bg-gray-800 animate-pulse rounded w-3/4" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
