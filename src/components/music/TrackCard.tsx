import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Play,
  Heart,
  MessageCircle,
  Zap,
  Plus,
  MoreHorizontal
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { useLikeTrack, useTrackReactions, useLikedSongs } from '@/hooks/useNostrMusic';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import type { WavlakeTrack } from '@/lib/wavlake';
import { cn } from '@/lib/utils';

interface TrackCardProps {
  track: WavlakeTrack;
  showArtist?: boolean;
  showAlbum?: boolean;
  className?: string;
  queue?: WavlakeTrack[];
  onAddToPlaylist?: (track: WavlakeTrack) => void;
  onComment?: (track: WavlakeTrack) => void;
  onZap?: (track: WavlakeTrack) => void;
}

export function TrackCard({
  track,
  showArtist = true,
  showAlbum = true,
  className,
  queue,
  onAddToPlaylist,
  onComment,
  onZap,
}: TrackCardProps) {
  const { state, playTrack, togglePlayPause } = useMusicPlayer();
  const { user } = useCurrentUser();
  const { mutate: likeTrack } = useLikeTrack();
  const { data: likedSongs } = useLikedSongs();

  const trackUrl = `https://wavlake.com/track/${track.id}`;
  const { data: _reactions } = useTrackReactions(trackUrl);

  const isCurrentTrack = state.currentTrack?.id === track.id;

  const isLiked = likedSongs?.tags.some(tag => tag[0] === 'r' && tag[1] === trackUrl);

  const handlePlayPause = () => {
    if (isCurrentTrack) {
      togglePlayPause();
    } else {
      playTrack(track, queue);
    }
  };

  const handleLike = () => {
    if (user) {
      likeTrack({ track, trackUrl });
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatSats = (msats: string) => {
    const sats = parseInt(msats) / 1000;
    if (sats >= 1000000) {
      return `${(sats / 1000000).toFixed(1)}M`;
    } else if (sats >= 1000) {
      return `${(sats / 1000).toFixed(1)}K`;
    }
    return sats.toString();
  };

  return (
    <Card className={cn("group punk-card border-2 border-primary bg-card hover:neon-glow transition-all cursor-pointer", className)} onClick={handlePlayPause}>
      <CardContent className="p-3 sm:p-4">
        {/* Top row: Album art and track info side by side */}
        <div className="flex flex-row items-start gap-3 sm:gap-4">
          <div className="relative flex-shrink-0">
            <Avatar className="h-28 w-28 sm:h-32 sm:w-32 rounded-none border-2 border-foreground">
              <AvatarImage src={track.albumArtUrl} alt={track.albumTitle} />
              <AvatarFallback className="rounded-none bg-primary text-primary-foreground font-punk">
                {track.title.charAt(0)}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            {/* Song title */}
            <h3 className="font-bold text-sm sm:text-base truncate uppercase tracking-wide hover:text-primary transition-colors">
              {track.title}
            </h3>

            {/* Artist name */}
            {showArtist && (
              <Link
                to={`/artist/${track.artistId}`}
                className="block text-xs sm:text-sm text-accent truncate font-metal hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {track.artist}
              </Link>
            )}

            {/* Album name */}
            {showAlbum && (
              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                {track.albumTitle}
              </p>
            )}

            {/* Track info badges */}
            <div className="flex items-center space-x-2 mt-1">
              <Badge variant="outline" className="text-xs border-primary text-primary font-bold">
                {formatDuration(track.duration)}
              </Badge>
              {track.msatTotal && (
                <Badge variant="outline" className="text-xs border-accent text-accent font-bold">
                  ⚡ {formatSats(track.msatTotal)}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Actions row */}
        <div className="flex items-center justify-end space-x-2 sm:space-x-1 mt-3" onClick={(e) => e.stopPropagation()}>
            {user && (
            <>
              <Button
                size="icon"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  handleLike();
                }}
                className={cn(
                  "h-11 w-11 sm:h-8 sm:w-8 p-0 border border-primary",
                  isLiked ? "bg-primary text-primary-foreground" : "hover:bg-primary hover:text-primary-foreground"
                )}
              >
                <Heart className={cn("h-6 w-6 sm:h-4 sm:w-4", isLiked ? "fill-current" : "")} />
              </Button>

              <Button
                size="icon"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onComment?.(track);
                }}
                className="h-11 w-11 sm:h-8 sm:w-8 p-0 hover:bg-accent hover:text-accent-foreground border border-accent"
              >
                <MessageCircle className="h-6 w-6 sm:h-4 sm:w-4" />
              </Button>

              <Button
                size="icon"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onZap?.(track);
                }}
                className="h-11 w-11 sm:h-8 sm:w-8 p-0 text-yellow-500 hover:bg-yellow-500 hover:text-black border border-yellow-500"
              >
                <Zap className="h-6 w-6 sm:h-4 sm:w-4" />
              </Button>
            </>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-11 w-11 sm:h-8 sm:w-8 p-0 border border-muted-foreground"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-6 w-6 sm:h-4 sm:w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              side="bottom"
              sideOffset={4}
              alignOffset={-4}
              avoidCollisions={true}
              collisionPadding={16}
              className="punk-card border-2 border-primary min-w-[180px] max-w-[calc(100vw-32px)]"
            >
              {user && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddToPlaylist?.(track);
                  }}
                  className="font-bold uppercase tracking-wide"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  ADD TO PLAYLIST
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(trackUrl, '_blank');
                }}
                className="font-bold uppercase tracking-wide"
              >
                <Play className="h-4 w-4 mr-2" />
                VIEW ON WAVLAKE
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}