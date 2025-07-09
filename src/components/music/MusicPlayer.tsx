import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Heart,
  MessageCircle,
  Zap,
} from 'lucide-react';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { useLikeTrack } from '@/hooks/useNostrMusic';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export function MusicPlayer() {
  const {
    state,
    togglePlayPause,
    seekTo,
    setVolume,
    nextTrack,
    previousTrack
  } = useMusicPlayer();
  const { user } = useCurrentUser();
  const { mutate: likeTrack } = useLikeTrack();

  if (!state.currentTrack) {
    return null;
  }

  const { currentTrack, isPlaying, currentTime, duration, volume } = state;
  const trackUrl = `https://wavlake.com/track/${currentTrack.id}`;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = (value: number[]) => {
    seekTo(value[0]);
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
  };

  const handleLike = () => {
    if (user && currentTrack) {
      likeTrack({ track: currentTrack, trackUrl });
    }
  };

  return (
    <Card className="fixed bottom-0 left-0 right-0 z-50 rounded-none border-t-4 border-l-0 border-r-0 border-b-0 border-primary bg-card/95 backdrop-blur-sm">
      <CardContent className="p-4">
        <div className="flex items-center space-x-4">
          {/* Track Info */}
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <Avatar className="h-12 w-12 rounded-none border-2 border-primary">
              <AvatarImage src={currentTrack.albumArtUrl} alt={currentTrack.albumTitle} />
              <AvatarFallback className="rounded-none bg-primary text-primary-foreground font-punk">
                {currentTrack.title.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h4 className="font-bold text-sm truncate uppercase tracking-wide">
                {currentTrack.title}
              </h4>
              <Link to={`/artist/${currentTrack.artistId}`} className="text-sm text-accent truncate font-metal hover:underline">
                {currentTrack.artist}
              </Link>
            </div>
          </div>

          {/* Player Controls */}
          <div className="flex flex-col items-center space-y-2 flex-1 max-w-md">
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={previousTrack}
                disabled={state.currentIndex <= 0}
                className="h-8 w-8 p-0 border border-primary hover:bg-primary hover:text-primary-foreground"
              >
                <SkipBack className="h-4 w-4" />
              </Button>

              <Button
                size="sm"
                onClick={togglePlayPause}
                disabled={state.isLoading}
                className="h-10 w-10 rounded-none bg-primary hover:bg-primary/90 text-primary-foreground border-2 border-foreground neon-glow punk-button"
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={nextTrack}
                disabled={state.currentIndex >= state.queue.length - 1}
                className="h-8 w-8 p-0 border border-primary hover:bg-primary hover:text-primary-foreground"
              >
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>

            {/* Progress Bar */}
            <div className="flex items-center space-x-2 w-full">
              <span className="text-xs text-accent font-bold min-w-[40px]">
                {formatTime(currentTime)}
              </span>
              <Slider
                value={[currentTime]}
                max={duration || 100}
                step={1}
                onValueChange={handleSeek}
                className="flex-1 [&_[role=slider]]:border-2 [&_[role=slider]]:border-primary [&_[role=slider]]:bg-primary"
              />
              <span className="text-xs text-accent font-bold min-w-[40px]">
                {formatTime(duration)}
              </span>
            </div>
          </div>

          {/* Actions & Volume */}
          <div className="flex items-center space-x-2 flex-1 justify-end">
            {user && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleLike}
                  className="h-8 w-8 p-0 border border-primary hover:bg-primary hover:text-primary-foreground"
                >
                  <Heart className="h-4 w-4" />
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 border border-accent hover:bg-accent hover:text-accent-foreground"
                >
                  <MessageCircle className="h-4 w-4" />
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 border border-yellow-500 hover:bg-yellow-500 hover:text-black"
                >
                  <Zap className="h-4 w-4" />
                </Button>
              </>
            )}

            {/* Volume Control */}
            <div className="flex items-center space-x-2 min-w-[120px]">
              <Volume2 className="h-4 w-4 text-accent" />
              <Slider
                value={[volume]}
                max={1}
                step={0.1}
                onValueChange={handleVolumeChange}
                className="w-20 [&_[role=slider]]:border-2 [&_[role=slider]]:border-accent [&_[role=slider]]:bg-accent"
              />
            </div>
          </div>
        </div>

        {state.error && (
          <div className="mt-2 text-sm text-red-500">
            {state.error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}