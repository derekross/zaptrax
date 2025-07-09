import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, Filter } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TrackCard } from './TrackCard';
import { useWavlakeRankings } from '@/hooks/useWavlake';
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

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <Card className="punk-card border-2 border-primary">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <TrendingUp className="h-6 w-6 text-primary" />
              <CardTitle className="font-punk text-xl tracking-wider text-primary">
                TOP TRACKS
              </CardTitle>
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-accent" />
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-40 border-2 border-primary font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="punk-card border-2 border-primary">
                  {timeRangeOptions.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      className="font-bold uppercase tracking-wide"
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={genre} onValueChange={setGenre}>
                <SelectTrigger className="w-32 border-2 border-accent font-bold">
                  <SelectValue placeholder="GENRE" />
                </SelectTrigger>
                <SelectContent className="punk-card border-2 border-accent">
                  {genreOptions.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      className="font-bold uppercase tracking-wide"
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          {[...Array(10)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-16 w-16 rounded-md" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <div className="flex space-x-2">
                      <Skeleton className="h-5 w-12" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Track List */}
      {topTracks && topTracks.length > 0 && (
        <div className="space-y-4">
          {topTracks.map((track, index) => (
            <div key={track.id} className="relative">
              {/* Ranking Badge */}
              <div className="absolute -left-2 top-4 z-10">
                <div className="bg-primary text-primary-foreground text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
                  {index + 1}
                </div>
              </div>

              <TrackCard
                track={track}
                className="ml-4"
                onAddToPlaylist={onAddToPlaylist}
                onComment={onComment}
                onZap={onZap}
              />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {topTracks && topTracks.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 px-8 text-center">
            <div className="max-w-sm mx-auto space-y-6">
              <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="font-medium mb-2">No tracks found</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Try adjusting your filters or check back later.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}