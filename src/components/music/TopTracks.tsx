import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, Filter, Trophy, Music } from 'lucide-react';
import { UnifiedTrackItem } from './UnifiedTrackItem';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useWavlakeRankings } from '@/hooks/useWavlake';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import type { WavlakeTrack } from '@/lib/wavlake';

interface TopTracksProps {
  onAddToPlaylist?: (track: WavlakeTrack) => void;
  onComment?: (track: WavlakeTrack) => void;
  onZap?: (track: WavlakeTrack) => void;
}

export function TopTracks({
  onAddToPlaylist,
  onComment,
  onZap
}: TopTracksProps) {
  const [timeRange, setTimeRange] = React.useState<string>('7');
  const [genre, setGenre] = React.useState<string>('all');

  const { playTrack } = useMusicPlayer();

  const { data: topTracks, isLoading, error } = useWavlakeRankings({
    sort: 'sats',
    days: parseInt(timeRange),
    genre: genre === 'all' ? undefined : genre,
    limit: 50,
  });

  const timeRangeOptions = [
    { value: '1', label: 'Last 24 hours' },
    { value: '7', label: 'Last week' },
    { value: '30', label: 'Last month' },
    { value: '90', label: 'Last 3 months' },
  ];

  const genreOptions = [
    { value: 'all', label: 'All genres' },
    { value: 'rock', label: 'Rock' },
    { value: 'pop', label: 'Pop' },
    { value: 'hip-hop', label: 'Hip Hop' },
    { value: 'electronic', label: 'Electronic' },
    { value: 'jazz', label: 'Jazz' },
    { value: 'classical', label: 'Classical' },
    { value: 'country', label: 'Country' },
    { value: 'folk', label: 'Folk' },
    { value: 'blues', label: 'Blues' },
    { value: 'reggae', label: 'Reggae' },
  ];

  if (error) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 px-8 text-center">
          <div className="max-w-sm mx-auto space-y-6">
            <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <h3 className="font-medium mb-2">Failed to load top tracks</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {error.message}
              </p>
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
              >
                Try Again
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getTimeRangeLabel = () => {
    const option = timeRangeOptions.find(opt => opt.value === timeRange);
    return option?.label || 'Last week';
  };

  const getGenreLabel = () => {
    const option = genreOptions.find(opt => opt.value === genre);
    return option?.label || 'All genres';
  };

  const handleTrackClick = (track: WavlakeTrack) => {
    playTrack(track, topTracks);
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <Card className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border-orange-200 dark:border-orange-800">
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            {/* Top Tracks Icon */}
            <div className="h-32 w-32 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg">
              <Trophy className="h-16 w-16 text-white" />
            </div>

            {/* Top Tracks Info */}
            <div className="flex-1 space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Trending
                </p>
                <h1 className="text-3xl font-bold mt-1">Top Tracks</h1>
                <p className="text-muted-foreground mt-2">
                  Discover the most popular tracks {getTimeRangeLabel().toLowerCase()} • {getGenreLabel()}
                </p>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Music className="h-4 w-4" />
                  <span>{topTracks?.length || 0} tracks</span>
                </div>
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  <span>Ranked by popularity</span>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Filters:</span>
                </div>
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeRangeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={genre} onValueChange={setGenre}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {genreOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Track List */}
      {isLoading ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-16" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-2">
                <Skeleton className="h-6 w-8" />
                <Skeleton className="h-28 w-28 sm:h-32 sm:w-32 rounded-md" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <div className="flex space-x-1">
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : topTracks && topTracks.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Trending Now</h2>
              <p className="text-sm text-muted-foreground">{topTracks.length} tracks</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-1 p-2 sm:p-6">
            {topTracks.map((track, index) => (
              <UnifiedTrackItem
                key={track.id}
                track={track}
                index={index + 1}
                onClick={handleTrackClick}
                onAddToPlaylist={onAddToPlaylist}
                onComment={onComment}
                onZap={onZap}
                showAlbum={false}
              />
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-16 px-8 text-center">
            <div className="max-w-sm mx-auto space-y-4">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                <TrendingUp className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold mb-2">No tracks found</h3>
                <p className="text-sm text-muted-foreground">
                  Try adjusting your filters or check back later for trending tracks.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}