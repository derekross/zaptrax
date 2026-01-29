import React, { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Play, Pause, MoreHorizontal, Heart, Plus, MessageCircle, Zap } from 'lucide-react';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { cn } from '@/lib/utils';
import type { WavlakeTrack } from '@/lib/wavlake';
import type { UnifiedTrack } from '@/lib/unifiedTrack';

interface UnifiedTrackItemProps {
  track: UnifiedTrack | WavlakeTrack | null;
  index: number;
  isLoading?: boolean;
  isError?: boolean;
  onAddToPlaylist?: (track: UnifiedTrack | WavlakeTrack) => void;
  onRemoveFromLiked?: (track: UnifiedTrack | WavlakeTrack) => void;
  onComment?: (track: UnifiedTrack | WavlakeTrack) => void;
  onZap?: (track: UnifiedTrack | WavlakeTrack) => void;
  onClick?: (track: UnifiedTrack | WavlakeTrack) => void;
  showAlbum?: boolean;
  isLikedSongs?: boolean;
}

export function UnifiedTrackItem({
  track,
  index,
  isLoading = false,
  isError = false,
  onAddToPlaylist,
  onRemoveFromLiked,
  onComment,
  onZap,
  onClick,
  showAlbum = true,
  isLikedSongs = false,
}: UnifiedTrackItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { state, togglePlayPause } = useMusicPlayer();

  const isCurrentTrack = state.currentTrack?.id === track?.id;
  const isPlaying = isCurrentTrack && state.isPlaying;

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
        {showAlbum && (
          <div className="hidden md:block flex-1">
            <Skeleton className="h-3 w-32" />
          </div>
        )}
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
        "group grid gap-4 px-4 py-2 rounded-md cursor-pointer transition-all",
        "hover:bg-muted/50",
        isCurrentTrack && "bg-muted/30",
        isLikedSongs ? "grid-cols-10" : "grid-cols-12"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onClick?.(track)}
    >
      {/* Track Number / Play Button */}
      <div className="col-span-1 flex items-center justify-center">
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

      {/* Track Info (includes album art, title, artist) */}
      <div className={cn("flex items-center gap-3", isLikedSongs ? "col-span-6" : "col-span-5")}>
        <Avatar className="h-12 w-12 rounded-md">
          <AvatarImage src={track.albumArtUrl} alt={track.albumTitle} />
          <AvatarFallback className="rounded-md">
            {track.title.charAt(0)}
          </AvatarFallback>
        </Avatar>
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
      </div>

      {/* Album */}
      {showAlbum && (
        <div className={cn("flex items-center", isLikedSongs ? "col-span-2" : "col-span-3")}>
          <p className="text-sm text-muted-foreground truncate">
            {track.albumTitle}
          </p>
        </div>
      )}

      {/* Date Added (only for non-liked songs) */}
      {!isLikedSongs && (
        <div className="col-span-2 flex items-center">
          <span className="text-sm text-muted-foreground">
            {/* This could be populated with actual date if available */}
            --
          </span>
        </div>
      )}

      {/* Duration */}
      <div className="col-span-1 flex items-center justify-center gap-2">
        {track.duration ? (
          <span className="text-sm text-muted-foreground">
            {formatDuration(track.duration)}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">--:--</span>
        )}

        {/* Actions */}
        <div className="flex items-center">
          {isLikedSongs && onRemoveFromLiked ? (
            <Button
              size="sm"
              variant="ghost"
              className={cn(
                "h-8 w-8 p-0 text-gray-400 hover:text-purple-400 hover:bg-purple-900/20 transition-opacity",
                isHovered ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              )}
              onClick={(e) => {
                e.stopPropagation();
                onRemoveFromLiked(track);
              }}
            >
              <Heart className="h-4 w-4" />
            </Button>
          ) : (
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
                {onAddToPlaylist && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddToPlaylist(track);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add to Playlist
                  </DropdownMenuItem>
                )}
                {onComment && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onComment(track);
                    }}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Comment
                  </DropdownMenuItem>
                )}
                {onZap && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onZap(track);
                    }}
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Zap
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  );
}