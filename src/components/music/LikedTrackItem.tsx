import React, { useState } from 'react';
import { useWavlakeTrack } from '@/hooks/useWavlake';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { WavlakeTrack } from '@/lib/wavlake';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Play, Pause, MoreHorizontal, Heart, Clock } from 'lucide-react';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useLikeTrack } from '@/hooks/useNostrMusic';
import { cn } from '@/lib/utils';

interface LikedTrackItemProps {
  trackUrl: string;
  index: number;
  onClick?: (track: WavlakeTrack) => void;
}

export function LikedTrackItem({ trackUrl, index, onClick }: LikedTrackItemProps) {
  const trackId = trackUrl.substring(trackUrl.lastIndexOf('/') + 1);

  const { data: trackData, isLoading, isError } = useWavlakeTrack(trackId);
  const track = Array.isArray(trackData) ? trackData[0] : trackData;

  const [isHovered, setIsHovered] = useState(false);
  const { state, togglePlayPause } = useMusicPlayer();
  const { user } = useCurrentUser();
  const { mutate: likeTrack } = useLikeTrack();

  const isCurrentTrack = state.currentTrack?.id === track?.id;
  const isPlaying = isCurrentTrack && state.isPlaying;

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (track) {
      if (isCurrentTrack) {
        togglePlayPause();
      } else {
        console.log('LikedTrackItem - Playing track:', track);
        onClick?.(track);
      }
    }
  };

  const handleRemoveFromLiked = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (user && track) {
      likeTrack({ track, trackUrl });
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-4 p-2">
        <Skeleton className="h-4 w-6" />
        <Skeleton className="h-12 w-12 rounded-md" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-8 w-8" />
      </div>
    );
  }

  if (isError || !track) {
    return (
      <div className="flex items-center gap-4 p-2 text-sm text-red-500">
        <span className="w-6 text-center">{index}</span>
        <span>Error loading track</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group flex items-center gap-4 p-2 rounded-md cursor-pointer transition-all",
        "hover:bg-muted/50",
        isCurrentTrack && "bg-muted/30"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onClick?.(track)}
    >
      {/* Track Number / Play Button */}
      <div className="w-6 flex items-center justify-center">
        {isHovered || isCurrentTrack ? (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 hover:bg-transparent"
            onClick={handlePlayPause}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
        ) : (
          <span className={cn(
            "text-sm",
            isCurrentTrack ? "text-primary font-medium" : "text-muted-foreground"
          )}>
            {index}
          </span>
        )}
      </div>

      {/* Album Art */}
      <Avatar className="h-12 w-12 rounded-md">
        <AvatarImage src={track.albumArtUrl} alt={track.albumTitle} />
        <AvatarFallback className="rounded-md">
          {track.title.charAt(0)}
        </AvatarFallback>
      </Avatar>

      {/* Track Info */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          "font-medium truncate",
          isCurrentTrack ? "text-primary" : "text-foreground"
        )}>
          {track.title}
        </p>
        <p className="text-sm text-muted-foreground truncate">
          {track.artist}
        </p>
      </div>

      {/* Album */}
      <div className="hidden md:block flex-1 min-w-0">
        <p className="text-sm text-muted-foreground truncate">
          {track.albumTitle}
        </p>
      </div>

      {/* Duration */}
      <div className="flex items-center gap-2">
        {track.duration && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{formatDuration(track.duration)}</span>
          </div>
        )}

        {/* More Options */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className={cn(
                "h-8 w-8 p-0 transition-opacity",
                isHovered ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={handleRemoveFromLiked}
              className="text-red-600 focus:text-red-600"
            >
              <Heart className="h-4 w-4 mr-2 fill-current" />
              Remove from Liked Songs
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}