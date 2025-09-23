import React from 'react';
import { useWavlakeTrack } from '@/hooks/useWavlake';
import { UnifiedTrackItem } from './UnifiedTrackItem';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useRemoveFromLikedSongs } from '@/hooks/useNostrMusic';
import type { WavlakeTrack } from '@/lib/wavlake';

interface LikedTrackItemProps {
  trackUrl: string;
  index: number;
  onClick?: (track: WavlakeTrack) => void;
}

export function LikedTrackItem({ trackUrl, index, onClick }: LikedTrackItemProps) {
  const trackId = trackUrl.substring(trackUrl.lastIndexOf('/') + 1);
  const { data: trackData, isLoading, isError } = useWavlakeTrack(trackId);
  const track = Array.isArray(trackData) ? trackData[0] : trackData;

  const { user } = useCurrentUser();
  const { mutate: removeFromLikedSongs } = useRemoveFromLikedSongs();

  const handleRemoveFromLiked = (_track: WavlakeTrack) => {
    if (user) {
      removeFromLikedSongs({ trackUrl });
    }
  };

  return (
    <UnifiedTrackItem
      track={track}
      index={index}
      isLoading={isLoading}
      isError={isError}
      onClick={onClick}
      onRemoveFromLiked={handleRemoveFromLiked}
      isLikedSongs={true}
    />
  );
}