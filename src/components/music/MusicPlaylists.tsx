import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Music, FolderPlus } from 'lucide-react';
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
      {/* Header Section */}
      <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-200 dark:border-blue-800">
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            {/* Playlists Icon */}
            <div className="h-32 w-32 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg">
              <Music className="h-16 w-16 text-white" />
            </div>

            {/* Playlists Info */}
            <div className="flex-1 space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Your Library
                </p>
                <h1 className="text-3xl font-bold mt-1">Your Playlists</h1>
                <p className="text-muted-foreground mt-2">
                  Organize your favorite tracks into custom playlists
                </p>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Music className="h-4 w-4" />
                  <span>{userPlaylists?.length || 0} playlist{(userPlaylists?.length || 0) !== 1 ? 's' : ''}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <Button
                  onClick={() => setCreatePlaylistOpen(true)}
                  size="lg"
                  className="rounded-full px-8"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Create Playlist
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Playlists Grid */}
      {playlistsLoading ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-16" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-48 w-full rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : userPlaylists && userPlaylists.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Your Playlists</h2>
              <p className="text-sm text-muted-foreground">{userPlaylists.length} playlists</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-16 px-8 text-center">
            <div className="max-w-sm mx-auto space-y-4">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                <FolderPlus className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold mb-2">No playlists yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first playlist to organize your favorite tracks and discover new music.
                </p>
                <Button onClick={() => setCreatePlaylistOpen(true)} size="lg">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Playlist
                </Button>
              </div>
            </div>
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