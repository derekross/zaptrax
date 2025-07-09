import React from 'react';
import { useWavlakeTrack } from '@/hooks/useWavlake';
import { Skeleton } from '@/components/ui/skeleton';
import type { WavlakeTrack } from '@/lib/wavlake';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Play, Pause, Heart } from 'lucide-react';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useLikedSongs, useLikeTrack } from '@/hooks/useNostrMusic';
import { cn } from '@/lib/utils';

interface LikedTrackItemProps {
  trackUrl: string;
  onClick?: (track: WavlakeTrack) => void;
}

export function LikedTrackItem({ trackUrl, onClick }: LikedTrackItemProps) {
  const trackId = trackUrl.substring(trackUrl.lastIndexOf('/') + 1);

  const { data: trackData, isLoading, isError } = useWavlakeTrack(trackId);
  const track = Array.isArray(trackData) ? trackData[0] : trackData;

  const { state, togglePlayPause } = useMusicPlayer();
  const { user } = useCurrentUser();
  const { mutate: likeTrack } = useLikeTrack();
  const { data: likedSongs } = useLikedSongs();

  const isCurrentTrack = state.currentTrack?.id === track?.id;
  const isPlaying = isCurrentTrack && state.isPlaying;

  const isLiked = likedSongs?.tags.some(tag => tag[0] === 'r' && tag[1] === trackUrl);

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (track) {
      if (isCurrentTrack) {
        togglePlayPause();
      } else {
        onClick?.(track);
      }
    }
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (user && track) {
      likeTrack({ track, trackUrl, isLiked: isLiked || false });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center space-x-4">
        <Skeleton className="h-12 w-12 rounded-md" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
    );
  }

  if (isError || !track) {
    return (
      <div className="text-sm text-red-500">
        Error loading track: {trackUrl}
      </div>
    );
  }

  return (
    <div
      className="group flex items-center space-x-4 cursor-pointer hover:bg-muted/50 p-2 rounded-md hover:neon-glow transition-all"
      onClick={() => onClick?.(track)}
    >
      {/* Album Art & Play Button */}
      <div className="relative flex-shrink-0">
        <Avatar className="h-12 w-12 rounded-md border-2 border-foreground">
          <AvatarImage src={track.albumArtUrl} alt={track.albumTitle} />
          <AvatarFallback className="rounded-md bg-primary text-primary-foreground font-punk">
            {track.title.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <Button
          size="sm"
          variant="secondary"
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-primary/80 hover:bg-primary text-primary-foreground border-2 border-foreground punk-button"
          onClick={handlePlayPause}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>
      </div>
      <div>
        <p className="text-sm font-medium">{track.title}</p>
        <p className="text-xs text-muted-foreground">{track.artist}</p>
      </div>
      {user && (
        <Button
          size="sm"
          variant="ghost"
          onClick={handleLike}
          className={cn(
            "h-8 w-8 p-0 border border-primary ml-auto",
            isLiked ? "bg-primary text-primary-foreground" : "hover:bg-primary hover:text-primary-foreground"
          )}
        >
          <Heart className={cn("h-4 w-4", isLiked ? "fill-current" : "")} />
        </Button>
      )}
    </div>
  );
}