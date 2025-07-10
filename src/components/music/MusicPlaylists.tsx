import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, PlayCircle } from 'lucide-react';
import { PlaylistCard } from '@/components/music/PlaylistCard';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useUserPlaylists } from '@/hooks/useNostrMusic';
import { useNavigate } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import type { NostrEvent } from '@nostrify/nostrify';
import { CreatePlaylistDialog } from '@/components/music/CreatePlaylistDialog';
import { EditPlaylistDialog } from '@/components/music/EditPlaylistDialog';
import { DeletePlaylistDialog } from '@/components/music/DeletePlaylistDialog';
import { SharePlaylistDialog } from '@/components/music/SharePlaylistDialog';


export function MusicPlaylists() {
  const { user } = useCurrentUser();
  const { data: userPlaylists, isLoading: playlistsLoading } = useUserPlaylists();
  const navigate = useNavigate();

  const [createPlaylistOpen, setCreatePlaylistOpen] = useState(false);
  const [editPlaylistOpen, setEditPlaylistOpen] = useState(false);
  const [deletePlaylistOpen, setDeletePlaylistOpen] = useState(false);
  const [sharePlaylistOpen, setSharePlaylistOpen] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<NostrEvent | null>(null);


  const handlePlayPlaylist = (playlist: NostrEvent) => {
    // Navigate to the playlist page where playback will be handled
    const dTag = playlist.tags.find(tag => tag[0] === 'd')?.[1];
    if (dTag) {
      const naddr = nip19.naddrEncode({
        identifier: dTag,
        pubkey: playlist.pubkey,
        kind: playlist.kind,
      });
      navigate(`/playlist/${naddr}`);
    }
  };

  const handleEditPlaylist = (playlist: NostrEvent) => {
    setSelectedPlaylist(playlist);
    setEditPlaylistOpen(true);
  };

  const handleDeletePlaylist = (playlist: NostrEvent) => {
    setSelectedPlaylist(playlist);
    setDeletePlaylistOpen(true);
  };

  const handleSharePlaylist = (playlist: NostrEvent) => {
    setSelectedPlaylist(playlist);
    setSharePlaylistOpen(true);
  };

  if (!user) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 px-8 text-center">
          <h3 className="font-medium mb-2">Log in to see your playlists</h3>
          <p className="text-sm text-muted-foreground mb-4">
            You need to be logged in to create and view your playlists.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-punk font-black tracking-wider text-primary torn-edge">
          YOUR PLAYLISTS
        </h2>
        <Button
          onClick={() => setCreatePlaylistOpen(true)}
          className="punk-button bg-accent hover:bg-accent/90 text-accent-foreground"
        >
          <Plus className="h-4 w-4 mr-2" />
          CREATE PLAYLIST
        </Button>
      </div>

      {playlistsLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  <div className="h-16 w-16 bg-muted rounded-md" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : userPlaylists && userPlaylists.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {userPlaylists.map((playlist) => (
            <PlaylistCard
              key={playlist.id}
              playlist={playlist}
              onPlay={handlePlayPlaylist}
              onEdit={handleEditPlaylist}
              onDelete={handleDeletePlaylist}
              onShare={handleSharePlaylist}
            />
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-12 px-8 text-center">
            <PlayCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No playlists yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first playlist to organize your favorite tracks
            </p>
            <Button onClick={() => setCreatePlaylistOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              CREATE PLAYLIST
            </Button>
          </CardContent>
        </Card>
      )}

      <CreatePlaylistDialog
        open={createPlaylistOpen}
        onOpenChange={setCreatePlaylistOpen}
        initialTracks={[]}
      />

      <EditPlaylistDialog
        open={editPlaylistOpen}
        onOpenChange={setEditPlaylistOpen}
        playlist={selectedPlaylist}
      />

      <DeletePlaylistDialog
        open={deletePlaylistOpen}
        onOpenChange={setDeletePlaylistOpen}
        playlist={selectedPlaylist}
      />

      <SharePlaylistDialog
        open={sharePlaylistOpen}
        onOpenChange={setSharePlaylistOpen}
        playlist={selectedPlaylist}
      />
    </div>
  );
}