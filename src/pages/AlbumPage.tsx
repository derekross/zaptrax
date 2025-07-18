import { useParams, Link } from 'react-router-dom';
import { useState } from 'react';
import { useWavlakeAlbum } from '@/hooks/useWavlake';
import { TrackCard } from '@/components/music/TrackCard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Disc, Play, Pause } from 'lucide-react';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { CommentDialog } from '@/components/music/CommentDialog';
import { AddToPlaylistDialog } from '@/components/music/AddToPlaylistDialog';
import { ZapDialog } from '@/components/music/ZapDialog';
import type { WavlakeTrack } from '@/lib/wavlake';

export function AlbumPage() {
  const { albumId } = useParams<{ albumId: string }>();
  const { data: albumData, isLoading, error } = useWavlakeAlbum(albumId);
  const { state, playTrack, togglePlayPause } = useMusicPlayer();
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [selectedTrackForComment, setSelectedTrackForComment] = useState<WavlakeTrack | null>(null);
  const [addToPlaylistOpen, setAddToPlaylistOpen] = useState(false);
  const [selectedTrackForPlaylist, setSelectedTrackForPlaylist] = useState<WavlakeTrack | null>(null);
  const [zapDialogOpen, setZapDialogOpen] = useState(false);
  const [selectedTrackForZap, setSelectedTrackForZap] = useState<WavlakeTrack | null>(null);

  // Handle case where API might return an array
  const album = Array.isArray(albumData) ? albumData[0] : albumData;

  if (isLoading) {
    return (
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div className="flex items-center space-x-4 mb-8">
          <Skeleton className="w-32 h-32 rounded-md" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !album) {
    return (
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <Card className="border-dashed">
          <CardContent className="py-12 px-8 text-center">
            <Disc className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">Album not found</h3>
            <p className="text-sm text-muted-foreground">
              {error?.message || 'The album you are looking for does not exist.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isAlbumPlaying = () => {
    if (!state.currentTrack || !album?.tracks) return false;
    return album.tracks.some(track => track.id === state.currentTrack?.id) && state.isPlaying;
  };

  const handleAlbumPlay = () => {
    if (album?.tracks && album.tracks.length > 0) {
      const isCurrentTrackFromAlbum = album.tracks.some(track => track.id === state.currentTrack?.id);

      if (isCurrentTrackFromAlbum) {
        togglePlayPause();
      } else {
        playTrack(album.tracks[0], album.tracks);
      }
    }
  };

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

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
      {/* Album Header */}
      <div className="flex items-center space-x-4 mb-8">
        <img
          src={album.albumArtUrl}
          alt={album.title}
          className="w-32 h-32 rounded-md border-2 border-primary"
        />
        <div className="flex-1">
          <h1 className="text-4xl font-bold font-punk tracking-wider text-primary">
            {album.title.toUpperCase()}
          </h1>
          {album.tracks.length > 0 && (
            <Link
              to={`/artist/${album.tracks[0].artistId}`}
              className="text-lg text-accent font-metal hover:text-primary transition-colors hover:underline"
            >
              {album.artist}
            </Link>
          )}
          {album.tracks.length === 0 && (
            <p className="text-lg text-accent font-metal">
              {album.artist}
            </p>
          )}
          <p className="text-sm text-muted-foreground mb-4">
            {album.tracks.length} tracks
          </p>
          <Button
            size="lg"
            onClick={handleAlbumPlay}
            className="bg-primary hover:bg-primary/90 text-primary-foreground border-2 border-foreground punk-button font-bold uppercase tracking-wide"
          >
            {isAlbumPlaying() ? (
              <>
                <Pause className="h-5 w-5 mr-2" />
                PAUSE ALBUM
              </>
            ) : (
              <>
                <Play className="h-5 w-5 mr-2" />
                PLAY ALBUM
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Album Tracks */}
      <div className="space-y-4">
        <h2 className="text-2xl font-punk font-black tracking-wider text-primary torn-edge">
          TRACKS
        </h2>
        {album.tracks.map((track, index) => (
          <div key={track.id} className="relative">
            {/* Track Number Badge */}
            <div className="absolute -left-2 top-4 z-10">
              <div className="bg-accent text-accent-foreground text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
                {index + 1}
              </div>
            </div>

            <TrackCard
              track={track}
              className="ml-4"
              queue={album.tracks}
              onAddToPlaylist={handleAddToPlaylist}
              onComment={handleComment}
              onZap={handleZap}
            />
          </div>
        ))}
      </div>

      {/* Dialogs */}
      <CommentDialog
        open={commentDialogOpen}
        onOpenChange={setCommentDialogOpen}
        track={selectedTrackForComment}
      />

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
    </div>
  );
}