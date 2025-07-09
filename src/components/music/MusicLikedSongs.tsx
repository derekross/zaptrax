import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Heart } from 'lucide-react';
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

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <div className="p-3 bg-primary border-2 border-foreground neon-glow">
          <Heart className="h-8 w-8 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-2xl font-punk font-black tracking-wider text-primary torn-edge">
            {getLikedSongsInfo().title.toUpperCase()}
          </h2>
          <p className="font-metal text-accent">
            {getLikedSongsInfo().description} • {getLikedSongsInfo().trackCount} TRACKS
          </p>
        </div>
      </div>

      {likedSongsLoading || allLikedTracksLoading ? (
        <div className="space-y-4">
          {[...Array(10)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  <div className="h-16 w-16 bg-muted rounded-md" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : likedTrackUrls.length > 0 ? (
        <div className="space-y-4">
          {likedTrackUrls.map((trackUrl) => (
            <LikedTrackItem key={trackUrl} trackUrl={trackUrl} onClick={handleTrackClick} />
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-12 px-8 text-center">
            <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No liked songs yet</h3>
            <p className="text-sm text-muted-foreground">
              Like songs to see them here
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}