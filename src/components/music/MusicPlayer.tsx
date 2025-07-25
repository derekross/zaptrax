import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
  Plus,
  List,
} from 'lucide-react';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { useLikeTrack, useLikedSongs } from '@/hooks/useNostrMusic';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { CommentDialog } from './CommentDialog';
import { ZapDialog } from './ZapDialog';
import { AddToPlaylistDialog } from './AddToPlaylistDialog';

export function MusicPlayer() {
  const {
    state,
    togglePlayPause,
    seekTo,
    setVolume,
    nextTrack,
    previousTrack,
    playTrackByIndex
  } = useMusicPlayer();
  const { user } = useCurrentUser();
  const { mutate: likeTrack } = useLikeTrack();
  const { data: likedSongs } = useLikedSongs();
  const location = useLocation();
  const prevPathnameRef = useRef(location.pathname);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [zapDialogOpen, setZapDialogOpen] = useState(false);
  const [addToPlaylistOpen, setAddToPlaylistOpen] = useState(false);

  // Close expanded player and restore scrolling when route changes
  useEffect(() => {
    // Only close if the pathname actually changed (not on initial mount or isExpanded change)
    if (prevPathnameRef.current !== location.pathname) {
      if (isExpanded) {
        setIsExpanded(false);
        setShowQueue(false);
        // Restore normal positioning
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
      }
      prevPathnameRef.current = location.pathname;
    }
  }, [location.pathname, isExpanded]);

  // Disable page scrolling when expanded player is open using position fixed
  useEffect(() => {
    if (isExpanded) {
      // Get current scroll position
      const scrollY = window.scrollY;
      // Fix body position to prevent scrolling
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
    } else {
      // Restore normal positioning and scroll position
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      // Restore scroll position
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY.replace('-', '').replace('px', '')) || 0);
      }
    }

    // Cleanup function to always restore normal positioning when component unmounts
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
    };
  }, [isExpanded]);

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

  const handleZap = () => {
    setZapDialogOpen(true);
  };

  const handleAddToPlaylist = () => {
    setAddToPlaylistOpen(true);
  };

  // Mini player (default, mobile)
  const miniPlayer = (
    <Card className="fixed bottom-0 left-0 right-0 z-50 rounded-none border-t bg-card pb-[env(safe-area-inset-bottom)] sm:hidden">
      <CardContent className="p-3">
        {/* Progress bar at top */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
          />
        </div>

        <div className="flex items-center space-x-3">
          {/* Track Info */}
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <Avatar className="h-12 w-12 rounded-lg">
              <AvatarImage src={currentTrack.albumArtUrl} alt={currentTrack.albumTitle} />
              <AvatarFallback className="rounded-lg bg-gradient-to-br from-primary to-primary/80 text-white font-semibold">
                {(currentTrack.title || '').charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h4 className="font-semibold text-sm truncate">
                {currentTrack.title}
              </h4>
              <Link
                to={`/artist/${currentTrack.artistId}`}
                className="text-sm text-muted-foreground truncate hover:text-foreground transition-colors"
              >
                {currentTrack.artist}
              </Link>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-1">
            {user && (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  className={`h-10 w-10 rounded-full ${isLiked ? 'text-pink-500' : ''}`}
                  onClick={handleLike}
                  aria-label="Like song"
                >
                  <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                </Button>

                <Button
                  size="icon"
                  variant="ghost"
                  className="h-10 w-10 rounded-full"
                  onClick={handleAddToPlaylist}
                  aria-label="Add to playlist"
                >
                  <Plus className="h-4 w-4" />
                </Button>

                <Button
                  size="icon"
                  variant="ghost"
                  className="h-10 w-10 rounded-full text-yellow-500 hover:text-yellow-600"
                  onClick={handleZap}
                  aria-label="Zap song"
                >
                  <Zap className="h-4 w-4" />
                </Button>
              </>
            )}

            <Button
              size="icon"
              onClick={togglePlayPause}
              disabled={state.isLoading}
              className="h-10 w-10 rounded-full bg-foreground text-background hover:bg-foreground/90"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
            </Button>

            <Button
              size="icon"
              variant="ghost"
              className="h-10 w-10 rounded-full"
              onClick={() => setIsExpanded(true)}
              aria-label="Expand player"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Fullscreen player (mobile)
  const fullPlayer = (
    <div className="fixed inset-0 z-50 bg-background flex flex-col sm:hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <Button
          size="icon"
          variant="ghost"
          className="h-10 w-10 rounded-full"
          onClick={() => {
            setIsExpanded(false);
            setShowQueue(false);
          }}
          aria-label="Collapse player"
        >
          <ChevronDown className="h-5 w-5" />
        </Button>
        <div className="text-center">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {showQueue ? 'Queue' : 'Now Playing'}
          </p>
        </div>
        <div className="w-10" /> {/* Spacer for centering */}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col px-4 py-2 overflow-hidden min-h-0" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {/* Album Art - fully responsive using viewport units */}
        <div className={`flex justify-center transition-all duration-300 ${showQueue ? 'mb-2' : 'mb-4'}`}>
          <div className="relative">
            <Avatar
              className="rounded-2xl shadow-2xl transition-all duration-300"
              style={{
                width: showQueue ? 'min(20vw, 8rem)' : 'min(65vw, 20rem)',
                height: showQueue ? 'min(20vw, 8rem)' : 'min(65vw, 20rem)',
              }}
            >
              <AvatarImage src={currentTrack.albumArtUrl} alt={currentTrack.albumTitle} />
              <AvatarFallback
                className="rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-white font-semibold transition-all duration-300"
                style={{
                  fontSize: showQueue ? 'min(4vw, 1.5rem)' : 'min(12vw, 4rem)',
                }}
              >
                {(currentTrack.title || '').charAt(0)}
              </AvatarFallback>
            </Avatar>
            {/* Subtle glow effect */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-primary/20 to-transparent pointer-events-none" />
          </div>
        </div>

        {/* Track Info - responsive typography */}
        <div className={`text-center space-y-1 transition-all duration-300 ${showQueue ? 'mb-2' : 'mb-4'}`}>
          <h1
            className="font-bold leading-tight px-4 transition-all duration-300"
            style={{
              fontSize: showQueue ? 'min(4vw, 1.125rem)' : 'min(6vw, 1.5rem)',
            }}
          >
            {currentTrack.title}
          </h1>
          <Link
            to={`/artist/${currentTrack.artistId}`}
            className="text-muted-foreground hover:text-foreground transition-colors"
            style={{
              fontSize: showQueue ? 'min(3.5vw, 0.875rem)' : 'min(4.5vw, 1.125rem)',
            }}
          >
            {currentTrack.artist}
          </Link>
          {currentTrack.albumTitle && !showQueue && (
            <p
              className="text-muted-foreground"
              style={{
                fontSize: 'min(3.5vw, 0.875rem)',
              }}
            >
              {currentTrack.albumTitle}
            </p>
          )}
        </div>

        {/* Queue List - only shown when showQueue is true */}
        {showQueue && (
          <div className="flex-1 overflow-y-auto mb-4 min-h-0 max-h-[40vh]">
            <div className="space-y-2">
              {state.queue.map((track, index) => (
                <div
                  key={`${track.id}-${index}`}
                  className={`flex items-center space-x-3 p-2 rounded-lg cursor-pointer transition-colors ${
                    index === state.currentIndex
                      ? 'bg-primary/10 border border-primary/20'
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => playTrackByIndex(index)}
                >
                  <Avatar className="h-10 w-10 rounded-md">
                    <AvatarImage src={track.albumArtUrl} alt={track.albumTitle} />
                    <AvatarFallback className="rounded-md bg-gradient-to-br from-primary to-primary/80 text-white text-xs font-semibold">
                      {(track.title || '').charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-medium text-sm truncate ${index === state.currentIndex ? 'text-primary' : ''}`}>
                      {track.title}
                    </h4>
                    <p className="text-xs text-muted-foreground truncate">
                      {track.artist}
                    </p>
                  </div>
                  {index === state.currentIndex && (
                    <div className="flex items-center">
                      {isPlaying ? (
                        <Pause className="h-3 w-3 text-primary" />
                      ) : (
                        <Play className="h-3 w-3 text-primary" />
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Progress Bar - responsive spacing */}
        <div className={`space-y-1 transition-all duration-300 ${showQueue ? 'mb-2' : 'mb-4'}`}>
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={1}
            onValueChange={handleSeek}
            className="w-full"
          />
          <div
            className="flex justify-between text-muted-foreground"
            style={{
              fontSize: 'min(3vw, 0.75rem)',
            }}
          >
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Main Controls - fully responsive using viewport units */}
        <div
          className="flex items-center justify-center transition-all duration-300"
          style={{
            gap: showQueue ? 'min(4vw, 1rem)' : 'min(6vw, 1.5rem)',
            marginBottom: showQueue ? 'min(2vw, 0.5rem)' : 'min(4vw, 1rem)',
          }}
        >
          <Button
            size="icon"
            variant="ghost"
            onClick={previousTrack}
            disabled={state.currentIndex <= 0}
            className="rounded-full hover:bg-muted transition-all duration-300"
            style={{
              width: showQueue ? 'min(8vw, 2.5rem)' : 'min(12vw, 3rem)',
              height: showQueue ? 'min(8vw, 2.5rem)' : 'min(12vw, 3rem)',
            }}
          >
            <SkipBack
              style={{
                width: showQueue ? 'min(4vw, 1.25rem)' : 'min(6vw, 1.5rem)',
                height: showQueue ? 'min(4vw, 1.25rem)' : 'min(6vw, 1.5rem)',
              }}
            />
          </Button>

          <Button
            size="icon"
            onClick={togglePlayPause}
            disabled={state.isLoading}
            className="rounded-full bg-foreground text-background hover:bg-foreground/90 shadow-lg transition-all duration-300"
            style={{
              width: showQueue ? 'min(12vw, 3rem)' : 'min(16vw, 4rem)',
              height: showQueue ? 'min(12vw, 3rem)' : 'min(16vw, 4rem)',
            }}
          >
            {isPlaying ? (
              <Pause
                style={{
                  width: showQueue ? 'min(6vw, 1.5rem)' : 'min(8vw, 2rem)',
                  height: showQueue ? 'min(6vw, 1.5rem)' : 'min(8vw, 2rem)',
                }}
              />
            ) : (
              <Play
                style={{
                  width: showQueue ? 'min(6vw, 1.5rem)' : 'min(8vw, 2rem)',
                  height: showQueue ? 'min(6vw, 1.5rem)' : 'min(8vw, 2rem)',
                  marginLeft: '0.125rem',
                }}
              />
            )}
          </Button>

          <Button
            size="icon"
            variant="ghost"
            onClick={nextTrack}
            disabled={state.currentIndex >= state.queue.length - 1}
            className="rounded-full hover:bg-muted transition-all duration-300"
            style={{
              width: showQueue ? 'min(8vw, 2.5rem)' : 'min(12vw, 3rem)',
              height: showQueue ? 'min(8vw, 2.5rem)' : 'min(12vw, 3rem)',
            }}
          >
            <SkipForward
              style={{
                width: showQueue ? 'min(4vw, 1.25rem)' : 'min(6vw, 1.5rem)',
                height: showQueue ? 'min(4vw, 1.25rem)' : 'min(6vw, 1.5rem)',
              }}
            />
          </Button>
        </div>

        {/* Secondary Actions - fully responsive */}
        {user && (
          <div
            className="flex items-center justify-center transition-all duration-300"
            style={{
              gap: showQueue ? 'min(3vw, 0.75rem)' : 'min(4vw, 1rem)',
              marginBottom: showQueue ? 'min(2vw, 0.5rem)' : 'min(3vw, 0.75rem)',
            }}
          >
            <Button
              size="icon"
              variant="ghost"
              onClick={handleLike}
              className={`rounded-full hover:bg-muted transition-all duration-300 ${isLiked ? 'text-pink-500' : ''}`}
              style={{
                width: showQueue ? 'min(8vw, 2.5rem)' : 'min(10vw, 2.75rem)',
                height: showQueue ? 'min(8vw, 2.5rem)' : 'min(10vw, 2.75rem)',
              }}
            >
              <Heart
                className={`transition-all duration-300 ${isLiked ? 'fill-current' : ''}`}
                style={{
                  width: showQueue ? 'min(4vw, 1rem)' : 'min(5vw, 1.25rem)',
                  height: showQueue ? 'min(4vw, 1rem)' : 'min(5vw, 1.25rem)',
                }}
              />
            </Button>

            <Button
              size="icon"
              variant="ghost"
              onClick={handleAddToPlaylist}
              className="rounded-full hover:bg-muted transition-all duration-300"
              style={{
                width: showQueue ? 'min(8vw, 2.5rem)' : 'min(10vw, 2.75rem)',
                height: showQueue ? 'min(8vw, 2.5rem)' : 'min(10vw, 2.75rem)',
              }}
            >
              <Plus
                style={{
                  width: showQueue ? 'min(4vw, 1rem)' : 'min(5vw, 1.25rem)',
                  height: showQueue ? 'min(4vw, 1rem)' : 'min(5vw, 1.25rem)',
                }}
              />
            </Button>

            <Button
              size="icon"
              variant="ghost"
              onClick={handleZap}
              className="rounded-full hover:bg-muted text-yellow-500 hover:text-yellow-600 transition-all duration-300"
              style={{
                width: showQueue ? 'min(8vw, 2.5rem)' : 'min(10vw, 2.75rem)',
                height: showQueue ? 'min(8vw, 2.5rem)' : 'min(10vw, 2.75rem)',
              }}
            >
              <Zap
                style={{
                  width: showQueue ? 'min(4vw, 1rem)' : 'min(5vw, 1.25rem)',
                  height: showQueue ? 'min(4vw, 1rem)' : 'min(5vw, 1.25rem)',
                }}
              />
            </Button>

            <Button
              size="icon"
              variant="ghost"
              onClick={handleComment}
              className="rounded-full hover:bg-muted transition-all duration-300"
              style={{
                width: showQueue ? 'min(8vw, 2.5rem)' : 'min(10vw, 2.75rem)',
                height: showQueue ? 'min(8vw, 2.5rem)' : 'min(10vw, 2.75rem)',
              }}
            >
              <MessageCircle
                style={{
                  width: showQueue ? 'min(4vw, 1rem)' : 'min(5vw, 1.25rem)',
                  height: showQueue ? 'min(4vw, 1rem)' : 'min(5vw, 1.25rem)',
                }}
              />
            </Button>
          </div>
        )}

        {/* Volume Control - fully responsive */}
        <div
          className="flex items-center justify-center px-8 transition-all duration-300"
          style={{
            gap: 'min(3vw, 1rem)',
            marginBottom: showQueue ? 'min(2vw, 0.5rem)' : user ? 'min(2vw, 0.5rem)' : 'min(3vw, 0.75rem)',
          }}
        >
          <Volume2
            className="text-muted-foreground transition-all duration-300"
            style={{
              width: showQueue ? 'min(4vw, 1rem)' : 'min(5vw, 1.25rem)',
              height: showQueue ? 'min(4vw, 1rem)' : 'min(5vw, 1.25rem)',
            }}
          />
          <Slider
            value={[volume]}
            max={1}
            step={0.1}
            onValueChange={handleVolumeChange}
            className="flex-1 transition-all duration-300"
            style={{
              maxWidth: showQueue ? 'min(40vw, 12rem)' : 'min(60vw, 20rem)',
            }}
          />
        </div>
      </div>

      {/* Queue Toggle */}
      <div className="border-t border-border/50 p-4 mt-auto flex-shrink-0">
        <button
          onClick={() => setShowQueue(!showQueue)}
          className="w-full flex items-center justify-between text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <span>Playing from queue</span>
          <div className="flex items-center space-x-2">
            <span>{state.currentIndex + 1} of {state.queue.length}</span>
            <ChevronUp className={`h-4 w-4 transition-transform duration-200 ${showQueue ? 'rotate-180' : ''}`} />
          </div>
        </button>
      </div>
    </div>
  );

  // Desktop mini player
  const desktopMiniPlayer = (
    <Card className="fixed bottom-0 left-0 right-0 z-50 rounded-none border-t bg-card pb-[env(safe-area-inset-bottom)] hidden sm:block">
      <CardContent className="p-4">
        <div className="flex items-center space-x-6">
          {/* Track Info */}
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <Avatar className="h-14 w-14 rounded-lg">
              <AvatarImage src={currentTrack.albumArtUrl} alt={currentTrack.albumTitle} />
              <AvatarFallback className="rounded-lg bg-gradient-to-br from-primary to-primary/80 text-white font-semibold">
                {(currentTrack.title || '').charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h4 className="font-semibold text-sm truncate">
                {currentTrack.title}
              </h4>
              <Link
                to={`/artist/${currentTrack.artistId}`}
                className="text-sm text-muted-foreground truncate hover:text-foreground transition-colors"
              >
                {currentTrack.artist}
              </Link>
            </div>
          </div>

          {/* Player Controls */}
          <div className="flex flex-col items-center space-y-3 flex-1 max-w-lg">
            <div className="flex items-center space-x-4">
              <Button
                size="icon"
                variant="ghost"
                onClick={previousTrack}
                disabled={state.currentIndex <= 0}
                className="h-8 w-8 rounded-full hover:bg-muted"
              >
                <SkipBack className="h-4 w-4" />
              </Button>

              <Button
                size="icon"
                onClick={togglePlayPause}
                disabled={state.isLoading}
                className="h-10 w-10 rounded-full bg-foreground text-background hover:bg-foreground/90"
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5 ml-0.5" />
                )}
              </Button>

              <Button
                size="icon"
                variant="ghost"
                onClick={nextTrack}
                disabled={state.currentIndex >= state.queue.length - 1}
                className="h-8 w-8 rounded-full hover:bg-muted"
              >
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>

            {/* Progress Bar */}
            <div className="flex items-center space-x-3 w-full">
              <span className="text-xs text-muted-foreground min-w-[40px] text-right">
                {formatTime(currentTime)}
              </span>
              <Slider
                value={[currentTime]}
                max={duration || 100}
                step={1}
                onValueChange={handleSeek}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground min-w-[40px]">
                {formatTime(duration)}
              </span>
            </div>
          </div>

          {/* Actions & Volume */}
          <div className="flex items-center space-x-3 flex-1 justify-end">
            {user && (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleLike}
                  className={`h-8 w-8 rounded-full hover:bg-muted ${isLiked ? 'text-pink-500' : ''}`}
                >
                  <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                </Button>

                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleAddToPlaylist}
                  className="h-8 w-8 rounded-full hover:bg-muted"
                >
                  <Plus className="h-4 w-4" />
                </Button>

                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleComment}
                  className="h-8 w-8 rounded-full hover:bg-muted"
                >
                  <MessageCircle className="h-4 w-4" />
                </Button>

                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleZap}
                  className="h-8 w-8 rounded-full hover:bg-muted text-yellow-500 hover:text-yellow-600"
                >
                  <Zap className="h-4 w-4" />
                </Button>
              </>
            )}

            {/* Volume Control */}
            <div className="flex items-center space-x-2 min-w-[120px]">
              <Volume2 className="h-4 w-4 text-muted-foreground" />
              <Slider
                value={[volume]}
                max={1}
                step={0.1}
                onValueChange={handleVolumeChange}
                className="w-20"
              />
            </div>

            {/* Expand Button */}
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 rounded-full hover:bg-muted"
              onClick={() => setIsExpanded(true)}
              aria-label="Expand player"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
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

  // Desktop expanded player
  const desktopExpandedPlayer = (
    <div className="fixed inset-0 z-50 bg-background backdrop-blur-sm hidden sm:flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-border/50">
        <Button
          size="icon"
          variant="ghost"
          className="h-10 w-10 rounded-full"
          onClick={() => {
            setIsExpanded(false);
            setShowQueue(false);
          }}
          aria-label="Collapse player"
        >
          <ChevronDown className="h-5 w-5" />
        </Button>
        <div className="text-center">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {showQueue ? 'Queue' : 'Now Playing'}
          </p>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-10 w-10 rounded-full"
          onClick={() => setShowQueue(!showQueue)}
          aria-label={showQueue ? 'Hide queue' : 'Show queue'}
        >
          <List className="h-5 w-5" />
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex p-8 overflow-hidden min-h-0">
        <div className={`w-full h-full transition-all duration-300 ${showQueue ? 'max-w-7xl mx-auto flex gap-8' : 'max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center'}`}>
          {/* Left Side - Album Art and Controls */}
          <div className={`transition-all duration-300 ${showQueue ? 'flex-shrink-0 w-96 space-y-6' : 'contents'}`}>
            {/* Album Art */}
            <div className={`flex justify-center ${showQueue ? '' : ''}`}>
              <div className="relative">
                <Avatar className={`rounded-3xl shadow-2xl transition-all duration-300 ${showQueue ? 'h-48 w-48' : 'h-80 w-80'}`}>
                  <AvatarImage src={currentTrack.albumArtUrl} alt={currentTrack.albumTitle} />
                  <AvatarFallback className={`rounded-3xl bg-gradient-to-br from-primary to-primary/80 text-white font-semibold transition-all duration-300 ${showQueue ? 'text-5xl' : 'text-9xl'}`}>
                    {(currentTrack.title || '').charAt(0)}
                  </AvatarFallback>
                </Avatar>
                {/* Subtle glow effect */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-primary/20 to-transparent pointer-events-none" />
              </div>
            </div>

            {/* Controls and Info */}
            <div className={`space-y-6 transition-all duration-300 ${showQueue ? '' : 'space-y-8'}`}>
            {/* Track Info */}
            <div className="space-y-3">
              <h1 className={`font-bold leading-tight transition-all duration-300 ${showQueue ? 'text-2xl' : 'text-4xl'}`}>
                {currentTrack.title}
              </h1>
              <Link
                to={`/artist/${currentTrack.artistId}`}
                className={`text-muted-foreground hover:text-foreground transition-colors block ${showQueue ? 'text-lg' : 'text-xl'}`}
              >
                {currentTrack.artist}
              </Link>
              {currentTrack.albumTitle && !showQueue && (
                <p className="text-lg text-muted-foreground">
                  {currentTrack.albumTitle}
                </p>
              )}
            </div>

            {/* Progress Bar */}
            <div className="space-y-3">
              <Slider
                value={[currentTime]}
                max={duration || 100}
                step={1}
                onValueChange={handleSeek}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Main Controls */}
            <div className={`flex items-center justify-center transition-all duration-300 ${showQueue ? 'space-x-6' : 'space-x-8'}`}>
              <Button
                size="icon"
                variant="ghost"
                onClick={previousTrack}
                disabled={state.currentIndex <= 0}
                className={`rounded-full hover:bg-muted transition-all duration-300 ${showQueue ? 'h-12 w-12' : 'h-14 w-14'}`}
              >
                <SkipBack className={`transition-all duration-300 ${showQueue ? 'h-6 w-6' : 'h-7 w-7'}`} />
              </Button>

              <Button
                size="icon"
                onClick={togglePlayPause}
                disabled={state.isLoading}
                className={`rounded-full bg-foreground text-background hover:bg-foreground/90 shadow-lg transition-all duration-300 ${showQueue ? 'h-16 w-16' : 'h-20 w-20'}`}
              >
                {isPlaying ? (
                  <Pause className={`transition-all duration-300 ${showQueue ? 'h-8 w-8' : 'h-10 w-10'}`} />
                ) : (
                  <Play className={`transition-all duration-300 ${showQueue ? 'h-8 w-8 ml-0.5' : 'h-10 w-10 ml-1'}`} />
                )}
              </Button>

              <Button
                size="icon"
                variant="ghost"
                onClick={nextTrack}
                disabled={state.currentIndex >= state.queue.length - 1}
                className={`rounded-full hover:bg-muted transition-all duration-300 ${showQueue ? 'h-12 w-12' : 'h-14 w-14'}`}
              >
                <SkipForward className={`transition-all duration-300 ${showQueue ? 'h-6 w-6' : 'h-7 w-7'}`} />
              </Button>
            </div>

            {/* Secondary Actions */}
            <div className="flex items-center justify-center space-x-6">
              {user && (
                <>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleLike}
                    className={`h-12 w-12 rounded-full hover:bg-muted ${isLiked ? 'text-pink-500' : ''}`}
                  >
                    <Heart className={`h-6 w-6 ${isLiked ? 'fill-current' : ''}`} />
                  </Button>

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleAddToPlaylist}
                    className="h-12 w-12 rounded-full hover:bg-muted"
                  >
                    <Plus className="h-6 w-6" />
                  </Button>

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleZap}
                    className="h-12 w-12 rounded-full hover:bg-muted text-yellow-500 hover:text-yellow-600"
                  >
                    <Zap className="h-6 w-6" />
                  </Button>

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleComment}
                    className="h-12 w-12 rounded-full hover:bg-muted"
                  >
                    <MessageCircle className="h-6 w-6" />
                  </Button>
                </>
              )}
            </div>

            {/* Volume Control */}
            <div className="flex items-center justify-center space-x-3">
              <Volume2 className="h-5 w-5 text-muted-foreground" />
              <Slider
                value={[volume]}
                max={1}
                step={0.1}
                onValueChange={handleVolumeChange}
                className="w-32"
              />
            </div>

            {/* Queue Info */}
            <div className="text-center text-sm text-muted-foreground">
              Playing from queue • {state.currentIndex + 1} of {state.queue.length}
            </div>
            </div>
          </div>

          {/* Queue List - only shown when showQueue is true */}
          {showQueue && (
            <div className="flex-1 flex flex-col h-full min-h-0 max-h-full">
              <div className="mb-4 flex-shrink-0">
                <h3 className="text-lg font-semibold mb-2">Up Next</h3>
                <p className="text-sm text-muted-foreground">
                  {state.queue.length} song{state.queue.length !== 1 ? 's' : ''} in queue
                </p>
              </div>
              <div className="flex-1 min-h-0 max-h-full relative">
                <div
                  className="absolute inset-0 overflow-y-auto overscroll-none pr-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
                  style={{ scrollbarGutter: 'stable' }}
                >
                  <div className="space-y-1 pb-4">
                    {state.queue.map((track, index) => (
                      <div
                        key={`${track.id}-${index}`}
                        className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                          index === state.currentIndex
                            ? 'bg-primary/10 border border-primary/20'
                            : 'hover:bg-muted'
                        }`}
                        onClick={() => playTrackByIndex(index)}
                      >
                        <div className="text-sm text-muted-foreground w-6 text-center flex-shrink-0">
                          {index + 1}
                        </div>
                        <Avatar className="h-12 w-12 rounded-md flex-shrink-0">
                          <AvatarImage src={track.albumArtUrl} alt={track.albumTitle} />
                          <AvatarFallback className="rounded-md bg-gradient-to-br from-primary to-primary/80 text-white text-sm font-semibold">
                            {(track.title || '').charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h4 className={`font-medium text-sm truncate ${index === state.currentIndex ? 'text-primary' : ''}`}>
                            {track.title}
                          </h4>
                          <p className="text-sm text-muted-foreground truncate">
                            {track.artist}
                          </p>
                        </div>
                        <div className="text-xs text-muted-foreground flex-shrink-0">
                          {track.duration ? formatTime(track.duration) : '--:--'}
                        </div>
                        {index === state.currentIndex && (
                          <div className="flex items-center flex-shrink-0">
                            {isPlaying ? (
                              <Pause className="h-4 w-4 text-primary" />
                            ) : (
                              <Play className="h-4 w-4 text-primary" />
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile */}
      {isExpanded ? fullPlayer : miniPlayer}

      {/* Desktop */}
      {isExpanded ? desktopExpandedPlayer : desktopMiniPlayer}

      <CommentDialog
        open={commentDialogOpen}
        onOpenChange={setCommentDialogOpen}
        track={currentTrack}
      />
      <ZapDialog
        open={zapDialogOpen}
        onOpenChange={setZapDialogOpen}
        track={currentTrack}
      />
      <AddToPlaylistDialog
        open={addToPlaylistOpen}
        onOpenChange={setAddToPlaylistOpen}
        track={currentTrack}
      />
    </>
  );
}