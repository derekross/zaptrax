import { useParams, Link } from 'react-router-dom';
import { useState } from 'react';
import { useWavlakeArtist } from '@/hooks/useWavlake';
import { useWavlakeArtistTracks } from '@/hooks/useWavlakeArtistTracks';
import { useAuthor } from '@/hooks/useAuthor';
import { TrackCard } from '@/components/music/TrackCard';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Disc, Music, Play, Pause } from 'lucide-react';
import { CommentDialog } from '@/components/music/CommentDialog';
import { AddToPlaylistDialog } from '@/components/music/AddToPlaylistDialog';
import { ZapDialog } from '@/components/music/ZapDialog';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import type { WavlakeTrack } from '@/lib/wavlake';

export function ArtistPage() {
  const { artistId } = useParams<{ artistId: string }>();
  const { data: artist, isLoading: artistLoading } = useWavlakeArtist(artistId);
  const { data: tracks, isLoading: tracksLoading } = useWavlakeArtistTracks(artistId);
  const { state, playTrack } = useMusicPlayer();

  // State to track which album is expanded
  const [expandedAlbumId, setExpandedAlbumId] = useState<string | null>(null);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [selectedTrackForComment, setSelectedTrackForComment] = useState<WavlakeTrack | null>(null);
  const [addToPlaylistOpen, setAddToPlaylistOpen] = useState(false);
  const [selectedTrackForPlaylist, setSelectedTrackForPlaylist] = useState<WavlakeTrack | null>(null);
  const [zapDialogOpen, setZapDialogOpen] = useState(false);
  const [selectedTrackForZap, setSelectedTrackForZap] = useState<WavlakeTrack | null>(null);

  // Find npub if present
  const npub = artist?.artistNpub;
  const author = useAuthor(npub);

  const isLoading = artistLoading || tracksLoading;

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!artist) {
    return <div>Artist not found</div>;
  }

  // Nostr profile info
  const nostrProfile = author?.data?.metadata;

  // Group tracks by album
  const tracksByAlbum = tracks.reduce((acc, track) => {
    const albumId = track.albumId;
    if (!acc[albumId]) {
      acc[albumId] = [];
    }
    acc[albumId].push(track);
    return acc;
  }, {} as Record<string, typeof tracks>);

  // Get unique albums with their tracks
  const albums = Object.entries(tracksByAlbum).map(([albumId, albumTracks]) => {
    const firstTrack = albumTracks[0];
    return {
      id: albumId,
      title: firstTrack.albumTitle,
      albumArtUrl: firstTrack.albumArtUrl,
      trackCount: albumTracks.length,
      tracks: albumTracks,
    };
  });

  const handleAlbumClick = (albumId: string) => {
    setExpandedAlbumId(expandedAlbumId === albumId ? null : albumId);
  };

  const handleAlbumPlay = (albumTracks: WavlakeTrack[], event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent album expansion when clicking play button
    if (albumTracks.length > 0) {
      playTrack(albumTracks[0], albumTracks);
    }
  };

  const isAlbumPlaying = (albumTracks: WavlakeTrack[]) => {
    if (!state.currentTrack) return false;
    return albumTracks.some(track => track.id === state.currentTrack?.id) && state.isPlaying;
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
      <div className="flex items-center space-x-4 mb-8">
        <img src={artist.artistArtUrl} alt={artist.name} className="w-32 h-32 rounded-full" />
        <div>
          {/* Nostr profile info */}
          {npub && nostrProfile && (
            <div className="mb-4 p-4 border rounded bg-muted/30">
              <div className="flex items-center space-x-3">
                {nostrProfile.picture && (
                  <img
                    src={nostrProfile.picture}
                    alt={nostrProfile.name || 'Nostr Avatar'}
                    className="w-12 h-12 rounded-full border"
                  />
                )}
                <div>
                  <div className="font-bold text-lg">{nostrProfile.display_name || nostrProfile.name}</div>
                  {nostrProfile.about && (
                    <div className="text-sm text-muted-foreground">{nostrProfile.about}</div>
                  )}
                  {nostrProfile.nip05 && (
                    <div className="text-xs text-accent">{nostrProfile.nip05}</div>
                  )}
                </div>
              </div>
            </div>
          )}
          <h1 className="text-4xl font-bold">{artist.name}</h1>
          <p className="text-lg text-muted-foreground">{artist.bio}</p>
        </div>
      </div>

      {/* Albums Section */}
      {albums.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-punk font-black tracking-wider text-primary torn-edge mb-4">
            ALBUMS
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {albums.map((album) => (
              <div key={album.id}>
                <Card
                  className="cursor-pointer hover:neon-glow transition-all punk-card border-2 border-primary group"
                  onClick={() => handleAlbumClick(album.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <Avatar className="h-16 w-16 rounded-md border-2 border-foreground">
                          <AvatarImage src={album.albumArtUrl} alt={album.title} />
                          <AvatarFallback className="rounded-md bg-primary text-primary-foreground font-punk">
                            <Disc className="h-6 w-6" />
                          </AvatarFallback>
                        </Avatar>
                        <Button
                          size="icon"
                          variant="secondary"
                          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-primary/80 hover:bg-primary text-primary-foreground border-2 border-foreground punk-button h-16 w-16"
                          onClick={(e) => handleAlbumPlay(album.tracks, e)}
                        >
                          {isAlbumPlaying(album.tracks) ? (
                            <Pause className="h-6 w-6" />
                          ) : (
                            <Play className="h-6 w-6" />
                          )}
                        </Button>
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link
                          to={`/album/${album.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="block"
                        >
                          <CardTitle className="font-bold text-sm truncate uppercase tracking-wide hover:text-primary transition-colors">
                            {album.title}
                          </CardTitle>
                        </Link>
                        <Badge variant="outline" className="text-xs border-accent text-accent font-bold mt-1">
                          {album.trackCount} TRACKS
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                {/* Expanded Album Tracks */}
                {expandedAlbumId === album.id && (
                  <div className="mt-4 space-y-2">
                    {album.tracks.map((track, index) => (
                      <div key={track.id} className="relative">
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
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Tracks Section */}
      <div className="space-y-4">
        <h2 className="text-2xl font-punk font-black tracking-wider text-primary torn-edge flex items-center space-x-2">
          <Music className="h-6 w-6" />
          <span>ALL TRACKS</span>
        </h2>
        {tracks.map(track => (
          <TrackCard
            key={track.id}
            track={track}
            queue={tracks}
            onAddToPlaylist={handleAddToPlaylist}
            onComment={handleComment}
            onZap={handleZap}
          />
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
