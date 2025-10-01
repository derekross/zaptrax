import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Play, ChevronRight, Heart, Radio, Music } from 'lucide-react';
import { useWavlakeRankings } from '@/hooks/useWavlake';
import { usePodcastIndexTop100 } from '@/hooks/usePodcastIndex';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useLikedSongs, useUserPlaylists } from '@/hooks/useNostrMusic';
import { useListeningHistory } from '@/hooks/useListeningHistory';
import type { WavlakeTrack } from '@/lib/wavlake';
import { wavlakeAPI } from '@/lib/wavlake';
import { podcastIndexAPI } from '@/lib/podcastindex';
import { wavlakeToUnified, podcastIndexTop100ToUnified, podcastIndexEpisodeToUnified } from '@/lib/unifiedTrack';
import type { NostrEvent } from '@nostrify/nostrify';
import { cn } from '@/lib/utils';
import { nip19 } from 'nostr-tools';
import { useQueries } from '@tanstack/react-query';

const categories = [
  'All', 'Rock', 'Pop', 'Hip Hop', 'Electronic', 'Jazz', 'Classical', 'Folk', 'Blues', 'Country', 'Reggae'
];

const timePeriods = [
  { label: '24 Hours', days: 1 },
  { label: 'Last Week', days: 7 },
  { label: 'Last Month', days: 30 },
  { label: 'Last 3 Months', days: 90 }
];

export function MusicHome() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedTimePeriod, setSelectedTimePeriod] = useState(7); // Default to last week
  const [showAllTopTracks, setShowAllTopTracks] = useState(false);
  const [showAllPodcastMusic, setShowAllPodcastMusic] = useState(false);

  const { user } = useCurrentUser();
  const { playTrack } = useMusicPlayer();
  const { data: likedSongs } = useLikedSongs();
  const { data: listeningHistory, isLoading: historyLoading } = useListeningHistory();
  const { data: userPlaylists, isLoading: playlistsLoading } = useUserPlaylists();
  const navigate = useNavigate();

  // Get liked songs track URLs
  const getLikedSongsTracksUrls = () => {
    if (!likedSongs) return [];
    const trackTags = likedSongs.tags.filter(tag => tag[0] === 'r');
    return trackTags.map(tag => tag[1]); // URLs
  };

  const likedTrackUrls = getLikedSongsTracksUrls();

  // Load all liked tracks data
  const allLikedTracksData = useQueries({
    queries: likedTrackUrls.map(url => {
      const trackId = url.substring(url.lastIndexOf('/') + 1);
      return {
        queryKey: ['wavlake-track', trackId],
        queryFn: () => wavlakeAPI.getTrack(trackId),
        enabled: !!trackId && likedTrackUrls.length > 0,
        staleTime: 30 * 60 * 1000,
      };
    }),
  });

  const allLikedTracks: WavlakeTrack[] = allLikedTracksData
    .filter(query => query.isSuccess && query.data)
    .map(query => (Array.isArray(query.data) ? query.data[0] : query.data));

  // Filter genre for API call - convert 'All' to undefined, others to lowercase
  const genreFilter = selectedCategory === 'All' ? undefined : selectedCategory.toLowerCase();

  const { data: topTracks, isLoading } = useWavlakeRankings({
    sort: 'sats',
    days: selectedTimePeriod,
    genre: genreFilter,
    limit: 50, // Get all 50 tracks
  });

  // Fetch PodcastIndex top 100 music
  const { data: podcastIndexTop100, isLoading: isPodcastIndexLoading, error: podcastIndexError } = usePodcastIndexTop100();

  // Debug: Log PodcastIndex state
  React.useEffect(() => {
    console.log('PodcastIndex Top 100 State:', {
      isLoading: isPodcastIndexLoading,
      hasData: !!podcastIndexTop100,
      dataLength: podcastIndexTop100?.length,
      error: podcastIndexError,
    });
  }, [podcastIndexTop100, isPodcastIndexLoading, podcastIndexError]);


  const handleTrackPlay = (track: WavlakeTrack) => {
    if (topTracks) {
      playTrack(track, topTracks);
    }
  };

  const handleLibraryMore = () => {
    navigate('/playlists');
  };

  const handleLibraryPlay = () => {
    if (!user) return;

    if (allLikedTracks.length > 0) {
      // Play the liked songs playlist
      playTrack(allLikedTracks[0], allLikedTracks);
    } else if (listeningHistory && listeningHistory.length > 0) {
      // Play the most recent song if no liked songs available
      const mostRecentTrack = listeningHistory[0].track;
      playTrack(mostRecentTrack, [mostRecentTrack]);
    } else {
      // No music available, navigate to discover
      navigate('/');
    }
  };

  const handleTopTracksMore = () => {
    setShowAllTopTracks(true);
  };

  const handleArtistClick = (artistId: string) => {
    navigate(`/artist/${artistId}`);
  };

  const handlePlaylistClick = (playlist: NostrEvent) => {
    const dTag = playlist.tags.find(tag => tag[0] === 'd')?.[1];
    if (dTag) {
      const naddr = nip19.naddrEncode({
        identifier: dTag,
        pubkey: playlist.pubkey,
        kind: playlist.kind,
      });
      navigate(`/playlist/${naddr}`);
    }
  };

  const handlePodcastIndexTrackPlay = async (feedId: number, itemGuid: string) => {
    try {
      // Fetch both the feed details and episodes
      const [feedResponse, episodesData] = await Promise.all([
        podcastIndexAPI.getFeedById(feedId),
        podcastIndexAPI.getFeedEpisodes(feedId),
      ]);

      if (episodesData.items.length === 0) {
        console.error('No episodes found for feed');
        return;
      }

      // Find the specific episode by guid, or just play the first one
      const episode = episodesData.items.find(ep => ep.guid === itemGuid) || episodesData.items[0];

      // Convert all episodes to unified tracks, passing feed info for author
      const allTracks = episodesData.items.map(ep => podcastIndexEpisodeToUnified(ep, feedResponse.feed));
      const trackToPlay = podcastIndexEpisodeToUnified(episode, feedResponse.feed);

      // Play the track
      playTrack(trackToPlay, allTracks);
    } catch (error) {
      console.error('Failed to play PodcastIndex track:', error);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Filters Navigation */}
      <div className="px-6 py-2 space-y-4">
        {/* Genre Filter */}
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-2">Genres</h3>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "ghost"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className={cn(
                  "whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  selectedCategory === category
                    ? "bg-purple-600 text-white hover:bg-purple-700"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"
                )}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* Time Period Filter */}
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-2">Time Period</h3>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {timePeriods.map((period) => (
              <Button
                key={period.days}
                variant={selectedTimePeriod === period.days ? "default" : "ghost"}
                size="sm"
                onClick={() => setSelectedTimePeriod(period.days)}
                className={cn(
                  "whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  selectedTimePeriod === period.days
                    ? "bg-purple-600 text-white hover:bg-purple-700"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"
                )}
              >
                {period.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Listen Again Section */}
      {user && (
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Listen again</h2>
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-purple-400 hover:bg-purple-900/20 transition-colors"
              onClick={handleLibraryMore}
            >
              More
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          <div className="flex gap-6 overflow-x-auto pb-4">
            {/* User Library Card */}
            <div className="flex-shrink-0">
              <Card className="bg-gray-900 border-gray-800 hover:bg-gray-800 transition-colors cursor-pointer w-40" onClick={() => navigate('/liked')}>
                <CardContent className="p-0">
                  <div className="relative group">
                    <div className="w-full h-40 bg-gradient-to-br from-purple-600 to-purple-800 rounded-t-lg flex items-center justify-center">
                      <Heart className="h-12 w-12 text-white fill-current" />
                    </div>
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-t-lg flex items-center justify-center">
                      <Button
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700 text-white rounded-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLibraryPlay();
                        }}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-white font-medium text-sm truncate">Liked Music</p>
                    <p className="text-gray-400 text-xs truncate">{likedSongs?.tags.filter(tag => tag[0] === 'r').length || 0} songs</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Track and New Playlists */}
            {historyLoading || playlistsLoading ? (
              // Loading state
              [...Array(5)].map((_, i) => (
                <div key={i} className="flex-shrink-0">
                  <Card className="bg-gray-900 border-gray-800 w-40">
                    <CardContent className="p-0">
                      <div className="w-full h-40 bg-gray-800 animate-pulse rounded-t-lg" />
                      <div className="p-3 space-y-2">
                        <div className="h-4 bg-gray-800 animate-pulse rounded" />
                        <div className="h-3 bg-gray-800 animate-pulse rounded w-3/4" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))
            ) : (
              <>
                {/* Show most recent track if available */}
                {listeningHistory && listeningHistory.length > 0 && (
                  <div key={listeningHistory[0].track.id} className="flex-shrink-0">
                    <Card className="bg-gray-900 border-gray-800 hover:bg-gray-800 transition-colors cursor-pointer w-40">
                      <CardContent className="p-0">
                        <div className="relative group">
                          <img
                            src={listeningHistory[0].track.albumArtUrl}
                            alt={listeningHistory[0].track.title}
                            className="w-full h-40 object-cover rounded-t-lg"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-t-lg flex items-center justify-center">
                            <Button
                              size="sm"
                              className="bg-purple-600 hover:bg-purple-700 text-white rounded-full"
                              onClick={() => handleTrackPlay(listeningHistory[0].track)}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="p-3">
                          <p className="text-white font-medium text-sm truncate">{listeningHistory[0].track.title}</p>
                          <p
                            className="text-gray-400 text-xs truncate hover:text-purple-400 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent card play
                              handleArtistClick(listeningHistory[0].track.artistId);
                            }}
                          >
                            {listeningHistory[0].track.artist}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Show new playlists */}
                {userPlaylists && userPlaylists.length > 0 && (
                  userPlaylists
                    .sort((a, b) => b.created_at - a.created_at) // Most recent first
                    .slice(0, 4) // Show up to 4 recent playlists
                    .map((playlist) => {
                      const playlistTitle = playlist.tags.find(tag => tag[0] === 'title')?.[1] || 'Untitled Playlist';
                      const trackCount = playlist.tags.filter(tag => tag[0] === 'r' && tag[1]?.includes('wavlake.com/track/')).length;

                      return (
                        <div key={playlist.id} className="flex-shrink-0">
                          <Card
                            className="bg-gray-900 border-gray-800 hover:bg-gray-800 transition-colors cursor-pointer w-40"
                            onClick={() => handlePlaylistClick(playlist)}
                          >
                            <CardContent className="p-0">
                              <div className="relative group">
                                <div className="w-full h-40 bg-gradient-to-br from-purple-600 to-purple-800 rounded-t-lg flex items-center justify-center">
                                  <div className="text-white text-center">
                                    <div className="text-2xl mb-2">🎵</div>
                                    <div className="text-xs px-2">{trackCount} tracks</div>
                                  </div>
                                </div>
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
                                <p className="text-white font-medium text-sm truncate">{playlistTitle}</p>
                                <p className="text-gray-400 text-xs truncate">Playlist</p>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      );
                    })
                )}

                {/* Fallback to top tracks if needed */}
                {(!listeningHistory || listeningHistory.length === 0) &&
                 (!userPlaylists || userPlaylists.length === 0) &&
                 topTracks?.slice(0, 5).map((track) => (
                  <div key={track.id} className="flex-shrink-0">
                    <Card className="bg-gray-900 border-gray-800 hover:bg-gray-800 transition-colors cursor-pointer w-40">
                      <CardContent className="p-0">
                        <div className="relative group">
                          <img
                            src={track.albumArtUrl}
                            alt={track.title}
                            className="w-full h-40 object-cover rounded-t-lg"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-t-lg flex items-center justify-center">
                            <Button
                              size="sm"
                              className="bg-purple-600 hover:bg-purple-700 text-white rounded-full"
                              onClick={() => handleTrackPlay(track)}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="p-3">
                          <p className="text-white font-medium text-sm truncate">{track.title}</p>
                          <p
                            className="text-gray-400 text-xs truncate hover:text-purple-400 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent card play
                              handleArtistClick(track.artistId);
                            }}
                          >
                            {track.artist}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* PodcastIndex Top Music Section */}
      {podcastIndexTop100 && podcastIndexTop100.length > 0 && (
        <div className="px-6 py-4 mt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Radio className="h-6 w-6 text-purple-500" />
              Podcasting 2.0 Music
              <span className="text-lg font-normal text-gray-400 ml-2">
                • Top 100
              </span>
            </h2>
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-purple-400 hover:bg-purple-900/20 transition-colors"
              onClick={() => setShowAllPodcastMusic(true)}
            >
              More
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {(showAllPodcastMusic ? podcastIndexTop100 : podcastIndexTop100.slice(0, 12)).map((item) => {
              return (
                <Card
                  key={`pi-${item.feedId}-${item.itemGuid}`}
                  className="bg-gray-900 border-gray-800 hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  <CardContent className="p-0">
                    <div className="relative group">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-full aspect-square object-cover rounded-t-lg"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-t-lg flex items-center justify-center">
                        <Button
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-700 text-white rounded-full"
                          onClick={() => {
                            handlePodcastIndexTrackPlay(item.feedId, item.itemGuid);
                          }}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="text-white font-medium text-sm truncate">{item.title}</p>
                      <p
                        className="text-gray-400 text-xs truncate hover:text-purple-400 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/feed/${item.feedId}`);
                        }}
                      >
                        {item.author}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Show Less Button */}
          {showAllPodcastMusic && (
            <div className="flex justify-center mt-6">
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-purple-400 hover:bg-purple-900/20 transition-colors"
                onClick={() => setShowAllPodcastMusic(false)}
              >
                Show Less
                <ChevronRight className="h-4 w-4 ml-1 rotate-90" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* PodcastIndex Loading State */}
      {isPodcastIndexLoading && (
        <div className="px-6 py-8">
          <div className="flex items-center mb-6">
            <Radio className="h-6 w-6 text-purple-500 mr-2" />
            <h2 className="text-2xl font-bold text-white">Podcasting 2.0 Music</h2>
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

      {/* PodcastIndex Error State */}
      {podcastIndexError && (
        <div className="px-6 py-8">
          <Card className="bg-gray-900 border-red-800">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Radio className="h-6 w-6 text-red-500" />
                <div>
                  <h3 className="font-semibold text-white">Failed to load Podcasting 2.0 Music</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    {podcastIndexError.message || 'Unknown error occurred'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top Tracks Section */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Music className="h-6 w-6 text-purple-500" />
            Top Tracks
            <span className="text-lg font-normal text-gray-400 ml-2">
              • {timePeriods.find(p => p.days === selectedTimePeriod)?.label}
              {selectedCategory !== 'All' && ` • ${selectedCategory}`}
            </span>
          </h2>
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-purple-400 hover:bg-purple-900/20 transition-colors"
            onClick={handleTopTracksMore}
          >
            More
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {(showAllTopTracks ? topTracks : topTracks?.slice(0, 6))?.map((track) => (
            <Card key={track.id} className="bg-gray-900 border-gray-800 hover:bg-gray-800 transition-colors cursor-pointer">
              <CardContent className="p-0">
                <div className="relative group">
                  <img
                    src={track.albumArtUrl}
                    alt={track.albumTitle}
                    className="w-full aspect-square object-cover rounded-t-lg"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-t-lg flex items-center justify-center">
                    <Button
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700 text-white rounded-full"
                      onClick={() => handleTrackPlay(track)}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-white font-medium text-sm truncate">{track.albumTitle || track.title}</p>
                  <p
                    className="text-gray-400 text-xs truncate hover:text-purple-400 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent card play
                      handleArtistClick(track.artistId);
                    }}
                  >
                    {track.artist}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Show Less Button */}
        {showAllTopTracks && (
          <div className="flex justify-center mt-6">
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-purple-400 hover:bg-purple-900/20 transition-colors"
              onClick={() => setShowAllTopTracks(false)}
            >
              Show Less
              <ChevronRight className="h-4 w-4 ml-1 rotate-90" />
            </Button>
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="px-6 py-8">
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

    </div>
  );
}