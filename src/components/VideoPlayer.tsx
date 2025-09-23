import React, { useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface VideoPlayerProps {
  src: string;
  className?: string;
  autoPlay?: boolean;
  muted?: boolean;
  controls?: boolean;
}

export function VideoPlayer({
  src,
  className,
  autoPlay = false,
  muted = true,
  controls = true
}: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(muted);
  const [hasError, setHasError] = useState(false);
  const [videoRef, setVideoRef] = useState<HTMLVideoElement | null>(null);

  const togglePlay = () => {
    if (videoRef) {
      if (isPlaying) {
        videoRef.pause();
      } else {
        videoRef.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef) {
      videoRef.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = () => {
    if (videoRef) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRef.requestFullscreen();
      }
    }
  };

  if (hasError) {
    return (
      <div className={cn("relative rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 p-8 text-center", className)}>
        <p className="text-gray-500 dark:text-gray-400">Unable to load video</p>
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="text-purple-500 hover:underline text-sm mt-2 inline-block"
        >
          Open in new tab
        </a>
      </div>
    );
  }

  return (
    <div className={cn("relative group rounded-lg overflow-hidden bg-black", className)}>
      <video
        ref={setVideoRef}
        src={src}
        autoPlay={autoPlay}
        muted={isMuted}
        loop
        playsInline
        className="w-full h-auto"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onError={() => setHasError(true)}
        onLoadedMetadata={() => {
          if (autoPlay && videoRef) {
            videoRef.play().catch(() => {
              // Auto-play failed, that's okay
            });
          }
        }}
      />

      {controls && (
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={togglePlay}
                className="bg-black/50 hover:bg-black/70 text-white border-none"
                aria-label={isPlaying ? "Pause video" : "Play video"}
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>

              <Button
                size="sm"
                variant="secondary"
                onClick={toggleMute}
                className="bg-black/50 hover:bg-black/70 text-white border-none"
                aria-label={isMuted ? "Unmute video" : "Mute video"}
              >
                {isMuted ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
            </div>

            <Button
              size="sm"
              variant="secondary"
              onClick={toggleFullscreen}
              className="bg-black/50 hover:bg-black/70 text-white border-none"
              aria-label="Enter fullscreen"
            >
              <Maximize className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

interface YouTubeEmbedProps {
  videoId: string;
  className?: string;
  autoPlay?: boolean;
}

export function YouTubeEmbed({ videoId, className, autoPlay = false }: YouTubeEmbedProps) {
  const [isLoading, setIsLoading] = useState(true);
  const embedUrl = `https://www.youtube.com/embed/${videoId}${autoPlay ? '?autoplay=1&mute=1' : ''}`;

  return (
    <div className={cn("relative aspect-video rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800", className)}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-gray-500 dark:text-gray-400">Loading video...</div>
        </div>
      )}
      <iframe
        src={embedUrl}
        title="YouTube video player"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className="absolute inset-0 w-full h-full"
        onLoad={() => setIsLoading(false)}
      />
    </div>
  );
}

interface VideoContentProps {
  url: string;
  className?: string;
  autoPlay?: boolean;
}

export function VideoContent({ url, className, autoPlay = false }: VideoContentProps) {
  // Extract YouTube video ID from various YouTube URL formats
  const getYouTubeVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
      /youtube\.com\/shorts\/([^&\n?#]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  };

  // Check if URL is a video file
  const isVideoFile = (url: string): boolean => {
    const videoExtensions = ['.mp4', '.mov', '.webm', '.ogg', '.avi', '.mkv', '.m4v', '.3gp', '.flv'];
    const urlLower = url.toLowerCase();
    return videoExtensions.some(ext => urlLower.includes(ext));
  };

  const youtubeVideoId = getYouTubeVideoId(url);

  if (youtubeVideoId) {
    return (
      <YouTubeEmbed
        videoId={youtubeVideoId}
        className={className}
        autoPlay={autoPlay}
      />
    );
  }

  if (isVideoFile(url)) {
    return (
      <VideoPlayer
        src={url}
        className={className}
        autoPlay={autoPlay}
        muted={true}
      />
    );
  }

  return null;
}