import React from 'react';
import { useWavlakeTrack } from '@/hooks/useWavlake';
import { UnifiedTrackItem } from './UnifiedTrackItem';
import { Music } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WavlakeTrack } from '@/lib/wavlake';

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

  const handleClick = (_track: WavlakeTrack) => {
    onPlay?.(trackUrl);
  };

  if (!showDetails) {
    if (isLoading) return <p className="text-xs text-muted-foreground">Loading...</p>;
    if (isError || !track) return <p className="text-xs text-red-500">Error loading track</p>;
    return (
      <p className="text-xs text-muted-foreground truncate">
        {track.artist} - {track.title}
      </p>
    );
  }

  return (
    <UnifiedTrackItem
      track={track}
      index={index !== undefined ? index + 1 : 0}
      isLoading={isLoading}
      isError={isError}
      onClick={handleClick}
      showAlbum={false}
    />
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