import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Play,
  Pause,
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
import { useLikeTrack, useTrackReactions, useUpdateNowPlaying } from '@/hooks/useNostrMusic';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import type { WavlakeTrack } from '@/lib/wavlake';
import { cn } from '@/lib/utils';

interface TrackCardProps {
  track: WavlakeTrack;
  showArtist?: boolean;
  showAlbum?: boolean;
  className?: string;
  onAddToPlaylist?: (track: WavlakeTrack) => void;
  onComment?: (track: WavlakeTrack) => void;
  onZap?: (track: WavlakeTrack) => void;
}

export function TrackCard({
  track,
  showArtist = true,
  showAlbum = true,
  className,
  onAddToPlaylist,
  onComment,
  onZap,
}: TrackCardProps) {
  const { state, playTrack, togglePlayPause } = useMusicPlayer();
  const { user } = useCurrentUser();
  const { mutate: likeTrack } = useLikeTrack();
  const { mutate: updateNowPlaying } = useUpdateNowPlaying();

  const trackUrl = `https://wavlake.com/track/${track.id}`;
  const { data: reactions } = useTrackReactions(trackUrl);

  const isCurrentTrack = state.currentTrack?.id === track.id;
  const isPlaying = isCurrentTrack && state.isPlaying;

  const handlePlayPause = () => {
    if (isCurrentTrack) {
      togglePlayPause();
    } else {
      playTrack(track);
      if (user) {
        updateNowPlaying({ track, trackUrl });
      }
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
    <Card className={cn("group punk-card border-2 border-primary bg-card hover:neon-glow transition-all", className)}>
      <CardContent className="p-4">
        <div className="flex items-center space-x-4">
          {/* Album Art & Play Button */}
          <div className="relative flex-shrink-0">
            <Avatar className="h-16 w-16 rounded-none border-2 border-foreground">
              <AvatarImage src={track.albumArtUrl} alt={track.albumTitle} />
              <AvatarFallback className="rounded-none bg-primary text-primary-foreground font-punk">
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

          {/* Track Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm truncate uppercase tracking-wide">
              {track.title}
            </h3>
            {showArtist && (
              <p className="text-sm text-accent truncate font-metal">
                {track.artist}
              </p>
            )}
            {showAlbum && (
              <p className="text-xs text-muted-foreground truncate">
                {track.albumTitle}
              </p>
            )}
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

          {/* Actions */}
          <div className="flex items-center space-x-1">
            {user && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleLike}
                  className="h-8 w-8 p-0 hover:bg-primary hover:text-primary-foreground border border-primary"
                >
                  <Heart className="h-4 w-4" />
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onComment?.(track)}
                  className="h-8 w-8 p-0 hover:bg-accent hover:text-accent-foreground border border-accent"
                >
                  <MessageCircle className="h-4 w-4" />
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onZap?.(track)}
                  className="h-8 w-8 p-0 hover:bg-yellow-500 hover:text-black border border-yellow-500"
                >
                  <Zap className="h-4 w-4" />
                </Button>
              </>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 border border-muted-foreground">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="punk-card border-2 border-primary">
                {user && (
                  <DropdownMenuItem
                    onClick={() => onAddToPlaylist?.(track)}
                    className="font-bold uppercase tracking-wide"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    ADD TO PLAYLIST
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => window.open(trackUrl, '_blank')}
                  className="font-bold uppercase tracking-wide"
                >
                  VIEW ON WAVLAKE
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Reaction Stats */}
        {reactions && reactions.likeCount > 0 && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <span className="flex items-center space-x-1">
                <Heart className="h-3 w-3" />
                <span>{reactions.likeCount}</span>
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}