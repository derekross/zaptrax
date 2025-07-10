import React, { useState } from 'react';
import { TopTracks } from '@/components/music/TopTracks';
import { AddToPlaylistDialog } from '@/components/music/AddToPlaylistDialog';
import { ZapDialog } from '@/components/music/ZapDialog';
import { CommentDialog } from '@/components/music/CommentDialog';
import type { WavlakeTrack } from '@/lib/wavlake';


export function MusicHome() {

  const [addToPlaylistOpen, setAddToPlaylistOpen] = useState(false);
  const [selectedTrackForPlaylist, setSelectedTrackForPlaylist] = useState<WavlakeTrack | null>(null);
  const [zapDialogOpen, setZapDialogOpen] = useState(false);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [selectedTrackForZap, setSelectedTrackForZap] = useState<WavlakeTrack | null>(null);
  const [selectedTrackForComment, setSelectedTrackForComment] = useState<WavlakeTrack | null>(null);



  const handleAddToPlaylist = (track: WavlakeTrack) => {
    setSelectedTrackForPlaylist(track);
    setAddToPlaylistOpen(true);
  };

  const handleComment = (track: WavlakeTrack) => {
    setSelectedTrackForComment(track);
    setCommentDialogOpen(true);
  };

  const handleZap = (track: WavlakeTrack) => {
    setSelectedTrackForZap(track);
    setZapDialogOpen(true);
  };

  // handlePlayPlaylist, getLikedSongsTracks, getLikedSongsInfo are no longer needed here
  // as they are moved to MusicPlaylists and MusicLikedSongs components.

  return (
    <>
      {/* Discover Tab Content */}
      <TopTracks
        onAddToPlaylist={handleAddToPlaylist}
        onComment={handleComment}
        onZap={handleZap}
      />

      {/* Dialogs (these are still needed as they are triggered from TopTracks) */}
      <AddToPlaylistDialog
        open={addToPlaylistOpen}
        onOpenChange={setAddToPlaylistOpen}
        track={selectedTrackForPlaylist}
      />

      <ZapDialog
        open={zapDialogOpen}
        onOpenChange={setZapDialogOpen}
        track={selectedTrackForZap}
      />

      <CommentDialog
        open={commentDialogOpen}
        onOpenChange={setCommentDialogOpen}
        track={selectedTrackForComment}
      />
    </>
  );
}