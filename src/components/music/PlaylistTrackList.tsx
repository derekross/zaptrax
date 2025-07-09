import React from 'react';
import { useWavlakeTrack } from '@/hooks/useWavlake';
import { Skeleton } from '@/components/ui/skeleton';

interface PlaylistTrackItemProps {
  trackUrl: string;
}

function PlaylistTrackItem({ trackUrl }: PlaylistTrackItemProps) {
  const trackId = trackUrl.substring(trackUrl.lastIndexOf('/') + 1);
  const { data: track, isLoading, isError } = useWavlakeTrack(trackId);

  if (isLoading) {
    return <Skeleton className="h-4 w-full" />;
  }

  if (isError || !track) {
    return <span className="text-xs text-red-500">Error loading track</span>;
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
}

export function PlaylistTrackList({ trackUrls, limit = 3 }: PlaylistTrackListProps) {
  return (
    <div className="space-y-1 mt-2">
      {trackUrls.slice(0, limit).map((url) => (
        <PlaylistTrackItem key={url} trackUrl={url} />
      ))}
      {trackUrls.length > limit && (
        <p className="text-xs text-muted-foreground">+ {trackUrls.length - limit} more tracks</p>
      )}
    </div>
  );
}