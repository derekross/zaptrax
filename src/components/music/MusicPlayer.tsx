import React, { useState } from 'react';
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
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { useLikeTrack, useLikedSongs } from '@/hooks/useNostrMusic';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { CommentDialog } from './CommentDialog';

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
  const { data: likedSongs } = useLikedSongs();
  const [isExpanded, setIsExpanded] = useState(false);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);

  if (!state.currentTrack) {
    return null;
  }

  const { currentTrack, isPlaying, currentTime, duration, volume } = state;
  const trackUrl = `https://wavlake.com/track/${currentTrack.id}`;

  // Check if current track is liked
  const isLiked = likedSongs?.tags.some(tag => tag[0] === 'r' && tag[1] === trackUrl);

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

  const handleComment = () => {
    setCommentDialogOpen(true);
  };

  // Mini player (default, mobile)
  const miniPlayer = (
    <Card className="fixed bottom-0 left-0 right-0 z-50 rounded-none border-t-4 border-l-0 border-r-0 border-b-0 border-primary bg-card/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)] sm:hidden">
      <CardContent className="p-2">
        <div className="flex items-center space-x-2">
          {/* Track Info */}
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            <Avatar className="h-10 w-10 rounded-none border-2 border-primary">
              <AvatarImage src={currentTrack.albumArtUrl} alt={currentTrack.albumTitle} />
              <AvatarFallback className="rounded-none bg-primary text-primary-foreground font-punk">
                {(currentTrack.title || '').charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h4 className="font-bold text-xs truncate uppercase tracking-wide">
                {currentTrack.title}
              </h4>
              <Link to={`/artist/${currentTrack.artistId}`} className="text-xs text-accent truncate font-metal hover:underline">
                {currentTrack.artist}
              </Link>
            </div>
          </div>
          {/* Controls */}
          <div className="flex items-center space-x-1">
            <Button size="icon" onClick={togglePlayPause} className="h-10 w-10 rounded bg-primary text-primary-foreground border-2 border-foreground neon-glow punk-button">
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
            <Button size="icon" variant="ghost" className="h-10 w-10 p-0" onClick={() => setIsExpanded(true)} aria-label="Expand player">
              <ChevronUp className="h-6 w-6" />
            </Button>
            <Button size="icon" variant="ghost" className={`h-10 w-10 p-0 ${isLiked ? 'text-pink-500' : ''}`} onClick={handleLike} aria-label="Like song">
              <Heart className={`h-6 w-6 ${isLiked ? 'fill-current' : ''}`} />
            </Button>
            <Button size="icon" variant="ghost" className="h-10 w-10 p-0" onClick={handleComment} aria-label="Comment on song">
              <MessageCircle className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Fullscreen player (mobile)
  const fullPlayer = (
    <div className="fixed inset-0 z-50 bg-background flex flex-col sm:hidden">
      <div className="flex justify-end p-4">
        <Button size="icon" variant="ghost" className="h-10 w-10" onClick={() => setIsExpanded(false)} aria-label="Collapse player">
          <ChevronDown className="h-7 w-7" />
        </Button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <Avatar className="h-56 w-56 rounded-md border-4 border-primary mb-6 shadow-xl">
          <AvatarImage src={currentTrack.albumArtUrl} alt={currentTrack.albumTitle} />
          <AvatarFallback className="rounded-md bg-primary text-primary-foreground font-punk text-6xl">
            {(currentTrack.title || '').charAt(0)}
          </AvatarFallback>
        </Avatar>
        <h2 className="text-2xl font-bold uppercase tracking-wide text-center mb-1 truncate w-full">
          {currentTrack.title}
        </h2>
        <Link to={`/artist/${currentTrack.artistId}`} className="text-lg text-accent font-metal hover:underline mb-4 truncate w-full text-center">
          {currentTrack.artist}
        </Link>
        <div className="flex items-center justify-center space-x-4 mb-6">
          <Button size="icon" variant="ghost" onClick={previousTrack} className="h-14 w-14">
            <SkipBack className="h-7 w-7" />
          </Button>
          <Button size="icon" onClick={togglePlayPause} className="h-20 w-20 rounded-full bg-primary text-primary-foreground border-4 border-foreground neon-glow punk-button">
            {isPlaying ? <Pause className="h-10 w-10" /> : <Play className="h-10 w-10" />}
          </Button>
          <Button size="icon" variant="ghost" onClick={nextTrack} className="h-14 w-14">
            <SkipForward className="h-7 w-7" />
          </Button>
        </div>
        <div className="flex items-center justify-center space-x-4 mb-6">
          {user && (
            <>
              <Button size="icon" variant="ghost" onClick={handleLike} className={`h-12 w-12 border border-primary ${isLiked ? 'text-pink-500' : ''}`}>
                <Heart className={`h-7 w-7 ${isLiked ? 'fill-current' : ''}`} />
              </Button>
              <Button size="icon" variant="ghost" className="h-12 w-12 border border-yellow-500">
                <Zap className="h-7 w-7" />
              </Button>
              <Button size="icon" variant="ghost" onClick={handleComment} className="h-12 w-12 border border-accent">
                <MessageCircle className="h-7 w-7" />
              </Button>
            </>
          )}
        </div>
        <div className="w-full flex items-center space-x-2 mb-2">
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
    </div>
  );

  // Desktop player (unchanged)
  const desktopPlayer = (
    <Card className="fixed bottom-0 left-0 right-0 z-50 rounded-none border-t-4 border-l-0 border-r-0 border-b-0 border-primary bg-card/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)] hidden sm:block">
      <CardContent className="p-4">
        <div className="flex items-center space-x-4">
          {/* Track Info */}
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <Avatar className="h-12 w-12 rounded-none border-2 border-primary">
              <AvatarImage src={currentTrack.albumArtUrl} alt={currentTrack.albumTitle} />
              <AvatarFallback className="rounded-none bg-primary text-primary-foreground font-punk">
                {(currentTrack.title || '').charAt(0)}
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
              <Button
                size="sm"
                variant="ghost"
                onClick={handleLike}
                className={`h-8 w-8 p-0 border border-primary ${isLiked ? 'text-pink-500' : ''}`}
              >
                <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleComment}
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
            {/* Volume and other controls remain unchanged */}
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

  return (
    <>
      {isExpanded ? fullPlayer : miniPlayer}
      {desktopPlayer}
      <CommentDialog
        open={commentDialogOpen}
        onOpenChange={setCommentDialogOpen}
        track={currentTrack}
      />
    </>
  );
}