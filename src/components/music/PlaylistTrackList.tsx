import React from 'react';
import { useWavlakeTrack } from '@/hooks/useWavlake';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Play, Music, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlaylistTrackItemProps {
  trackUrl: string;
  showDetails?: boolean;
  index?: number;
  onPlay?: (trackUrl: string) => void;
}

export function PlaylistTrackItem({ trackUrl, showDetails = false, index, onPlay }: PlaylistTrackItemProps) {
  const trackId = trackUrl.substring(trackUrl.lastIndexOf('/') + 1);
  const { data: trackData, isLoading, isError } = useWavlakeTrack(trackId);
  const track = Array.isArray(trackData) ? trackData[0] : trackData;

  if (isLoading) {
    return showDetails ? (
      <div className="flex items-center space-x-3 p-2 rounded-md">
        <Skeleton className="h-4 w-6" />
        <Skeleton className="h-10 w-10 rounded" />
        <div className="flex-1 space-y-1">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-8 w-8" />
      </div>
    ) : (
      <Skeleton className="h-4 w-full" />
    );
  }

  if (isError || !track) {
    return showDetails ? (
      <div className="flex items-center space-x-3 p-2 rounded-md text-red-500">
        <span className="text-sm w-6">{index !== undefined ? index + 1 : ''}</span>
        <Music className="h-10 w-10 p-2 bg-muted rounded" />
        <div className="flex-1">
          <p className="text-sm">Error loading track</p>
          <p className="text-xs text-muted-foreground">{trackUrl}</p>
        </div>
      </div>
    ) : (
      <span className="text-xs text-red-500">Error loading track</span>
    );
  }

  if (showDetails) {
    return (
      <div className="group flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 bg-muted/30 rounded-md hover:bg-muted/50 transition-colors border border-border/50">
        <span className="text-sm text-muted-foreground w-6 text-center flex-shrink-0">
          {index !== undefined ? index + 1 : ''}
        </span>

        <div className="relative flex-shrink-0">
          {track.albumArtUrl ? (
            <img
              src={track.albumArtUrl}
              alt={track.title}
              className="h-8 w-8 sm:h-10 sm:w-10 rounded object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          <div className={`${track.albumArtUrl ? 'hidden' : ''} h-8 w-8 sm:h-10 sm:w-10 bg-muted-foreground/20 rounded flex items-center justify-center`}>
            <Music className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
          </div>
          <Button
            size="sm"
            variant="secondary"
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70 text-white border-0"
            onClick={() => onPlay?.(trackUrl)}
          >
            <Play className="h-2 w-2 sm:h-3 sm:w-3" />
          </Button>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{track.title}</p>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
            {track.duration && (
              <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
              </span>
            )}
          </div>
        </div>

        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <p className="text-xs text-muted-foreground truncate">
      {track.artist} - {track.title}
    </p>
  );
}

interface PlaylistTrackListProps {
  trackUrls: string[];
  limit?: number;
  showDetails?: boolean;
  onPlayTrack?: (trackUrl: string) => void;
}

export function PlaylistTrackList({
  trackUrls,
  limit = 3,
  showDetails = false,
  onPlayTrack
}: PlaylistTrackListProps) {
  const displayTracks = showDetails ? trackUrls : trackUrls.slice(0, limit);

  if (trackUrls.length === 0) {
    return showDetails ? (
      <div className="text-center py-8 text-muted-foreground">
        <Music className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No tracks in this playlist</p>
      </div>
    ) : null;
  }

  return (
    <div className={cn(
      showDetails ? "space-y-1" : "space-y-1 mt-2"
    )}>
      {displayTracks.map((url, index) => (
        <PlaylistTrackItem
          key={url}
          trackUrl={url}
          showDetails={showDetails}
          index={showDetails ? index : undefined}
          onPlay={onPlayTrack}
        />
      ))}
      {!showDetails && trackUrls.length > limit && (
        <p className="text-xs text-muted-foreground">+ {trackUrls.length - limit} more tracks</p>
      )}
    </div>
  );
}