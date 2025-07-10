import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Heart, Play, Music, Clock } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useLikedSongs } from '@/hooks/useNostrMusic';
import { LikedTrackItem } from './LikedTrackItem';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { wavlakeAPI } from '@/lib/wavlake';
import { WavlakeTrack } from '@/lib/wavlake';
import { useQueries } from '@tanstack/react-query';

export function MusicLikedSongs() {
  const { user } = useCurrentUser();
  const { data: likedSongs, isLoading: likedSongsLoading } = useLikedSongs();
  const { playTrack } = useMusicPlayer();

  const getLikedSongsTracksUrls = () => {
    if (!likedSongs) return [];
    const trackTags = likedSongs.tags.filter(tag => tag[0] === 'r');
    return trackTags.map(tag => tag[1]); // URLs
  };

  const likedTrackUrls = getLikedSongsTracksUrls();

  const allLikedTracksData = useQueries({
    queries: likedTrackUrls.map(url => {
      const trackId = url.substring(url.lastIndexOf('/') + 1);
      return {
        queryKey: ['wavlake-track', trackId],
        queryFn: () => wavlakeAPI.getTrack(trackId),
        enabled: !!trackId,
        staleTime: 30 * 60 * 1000,
      };
    }),
  });

  const allLikedTracks: WavlakeTrack[] = allLikedTracksData
    .filter(query => query.isSuccess && query.data)
    .map(query => (Array.isArray(query.data) ? query.data[0] : query.data));

  const allLikedTracksLoading = allLikedTracksData.some(query => query.isLoading);


  const getLikedSongsInfo = () => {
    if (!likedSongs) return { title: 'Liked Songs', description: 'Your favorite tracks', trackCount: 0 };
    const titleTag = likedSongs.tags.find(tag => tag[0] === 'title');
    const descriptionTag = likedSongs.tags.find(tag => tag[0] === 'description');
    const trackTags = likedSongs.tags.filter(tag => tag[0] === 'r');
    return {
      title: titleTag?.[1] || 'Liked Songs',
      description: descriptionTag?.[1] || 'Your favorite tracks',
      trackCount: trackTags.length,
    };
  };

  const handleTrackClick = (track: WavlakeTrack) => {
    if (allLikedTracks) {
      playTrack(track, allLikedTracks);
    }
  };

  const handlePlayAll = () => {
    if (allLikedTracks.length > 0) {
      playTrack(allLikedTracks[0], allLikedTracks);
    }
  };

  const formatDuration = (tracks: WavlakeTrack[]) => {
    const totalSeconds = tracks.reduce((acc, track) => acc + (track.duration || 0), 0);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (!user) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 px-8 text-center">
          <h3 className="font-medium mb-2">Log in to see your liked songs</h3>
          <p className="text-sm text-muted-foreground mb-4">
            You need to be logged in to like and view your favorite songs.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { title, description, trackCount } = getLikedSongsInfo();

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <Card className="bg-gradient-to-r from-pink-500/10 to-red-500/10 border-pink-200 dark:border-pink-800">
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            {/* Playlist Cover */}
            <div className="h-32 w-32 rounded-lg bg-gradient-to-br from-pink-500 to-red-500 flex items-center justify-center shadow-lg">
              <Heart className="h-16 w-16 text-white fill-current" />
            </div>

            {/* Playlist Info */}
            <div className="flex-1 space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Playlist
                </p>
                <h1 className="text-3xl font-bold mt-1">{title}</h1>
                <p className="text-muted-foreground mt-2">{description}</p>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Music className="h-4 w-4" />
                  <span>{trackCount} song{trackCount !== 1 ? 's' : ''}</span>
                </div>
                {allLikedTracks.length > 0 && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{formatDuration(allLikedTracks)}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              {trackCount > 0 && (
                <div className="flex items-center gap-3 pt-2">
                  <Button
                    onClick={handlePlayAll}
                    disabled={allLikedTracksLoading || allLikedTracks.length === 0}
                    size="lg"
                    className="rounded-full px-8"
                  >
                    <Play className="h-5 w-5 mr-2" />
                    Play All
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Track List */}
      {likedSongsLoading || allLikedTracksLoading ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-16" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-2">
                <Skeleton className="h-4 w-6" />
                <Skeleton className="h-12 w-12 rounded-md" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-8 w-8" />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : likedTrackUrls.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Songs</h2>
              <p className="text-sm text-muted-foreground">{trackCount} tracks</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {likedTrackUrls.map((trackUrl, index) => (
              <LikedTrackItem
                key={trackUrl}
                trackUrl={trackUrl}
                index={index + 1}
                onClick={handleTrackClick}
              />
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-16 px-8 text-center">
            <div className="max-w-sm mx-auto space-y-4">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                <Heart className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold mb-2">No liked songs yet</h3>
                <p className="text-sm text-muted-foreground">
                  Songs you like will appear here. Start exploring and find your favorites!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}