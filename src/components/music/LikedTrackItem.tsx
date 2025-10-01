import React from 'react';
import { UnifiedTrackItem } from './UnifiedTrackItem';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useRemoveFromLikedSongs } from '@/hooks/useNostrMusic';
import type { UnifiedTrack } from '@/lib/unifiedTrack';

interface LikedTrackItemProps {
  track: UnifiedTrack;
  index: number;
  onClick?: (track: UnifiedTrack) => void;
}

export function LikedTrackItem({ track, index, onClick }: LikedTrackItemProps) {
  const { user } = useCurrentUser();
  const { mutate: removeFromLikedSongs } = useRemoveFromLikedSongs();

  const handleRemoveFromLiked = (_track: UnifiedTrack) => {
    if (user) {
      // Use mediaUrl as the trackUrl for removal
      removeFromLikedSongs({ trackUrl: track.mediaUrl });
    }
  };

  return (
    <UnifiedTrackItem
      track={track}
      index={index}
      isLoading={false}
      isError={false}
      onClick={onClick}
      onRemoveFromLiked={handleRemoveFromLiked}
      isLikedSongs={true}
    />
  );
}