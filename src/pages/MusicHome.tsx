import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Play, ChevronRight } from 'lucide-react';
import { useWavlakeRankings } from '@/hooks/useWavlake';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useLikedSongs } from '@/hooks/useNostrMusic';
import { useListeningHistory } from '@/hooks/useListeningHistory';
import type { WavlakeTrack } from '@/lib/wavlake';
import { cn } from '@/lib/utils';

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

  const { user } = useCurrentUser();
  const { playTrack } = useMusicPlayer();
  const { data: likedSongs } = useLikedSongs();
  const { data: listeningHistory, isLoading: historyLoading } = useListeningHistory();
  const navigate = useNavigate();

  // Filter genre for API call - convert 'All' to undefined, others to lowercase
  const genreFilter = selectedCategory === 'All' ? undefined : selectedCategory.toLowerCase();

  const { data: topTracks, isLoading } = useWavlakeRankings({
    sort: 'sats',
    days: selectedTimePeriod,
    genre: genreFilter,
    limit: 50, // Get all 50 tracks
  });


  const handleTrackPlay = (track: WavlakeTrack) => {
    if (topTracks) {
      playTrack(track, topTracks);
    }
  };

  const handleLibraryMore = () => {
    navigate('/playlists');
  };

  const handleTopTracksMore = () => {
    setShowAllTopTracks(true);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Filters Navigation */}
      <div className="px-6 py-4 space-y-4">
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
            {/* User Profile Card */}
            <div className="flex-shrink-0">
              <div className="flex items-center gap-4 p-4 rounded-lg bg-gradient-to-r from-purple-600 to-purple-800 min-w-[280px]">
                <Avatar className="h-12 w-12">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-purple-700 text-white">
                    U
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-white font-medium">
                    Your Library
                  </p>
                  <p className="text-purple-200 text-sm">{user ? `${likedSongs?.tags.filter(tag => tag[0] === 'r').length || 0} liked songs` : 'Listen again'}</p>
                </div>
                <Button size="sm" variant="ghost" className="ml-auto text-white hover:bg-purple-700">
                  <Play className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Recent Tracks */}
            {historyLoading ? (
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
            ) : listeningHistory && listeningHistory.length > 0 ? (
              // Show actual listening history
              listeningHistory.slice(0, 5).map((historyItem) => (
                <div key={historyItem.track.id} className="flex-shrink-0">
                  <Card className="bg-gray-900 border-gray-800 hover:bg-gray-800 transition-colors cursor-pointer w-40">
                    <CardContent className="p-0">
                      <div className="relative group">
                        <img
                          src={historyItem.track.albumArtUrl}
                          alt={historyItem.track.title}
                          className="w-full h-40 object-cover rounded-t-lg"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-t-lg flex items-center justify-center">
                          <Button
                            size="sm"
                            className="bg-purple-600 hover:bg-purple-700 text-white rounded-full"
                            onClick={() => handleTrackPlay(historyItem.track)}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="p-3">
                        <p className="text-white font-medium text-sm truncate">{historyItem.track.title}</p>
                        <p className="text-gray-400 text-xs truncate">{historyItem.track.artist}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))
            ) : (
              // Fallback to top tracks if no listening history
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
                        <p className="text-gray-400 text-xs truncate">{track.artist}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Top Tracks Section */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">
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
                  <p className="text-gray-400 text-xs truncate">{track.artist}</p>
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