import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Plus, Music, FolderPlus, Heart, Play, MoreHorizontal, MessageCircle, Edit, Share2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PlaylistCard } from '@/components/music/PlaylistCard';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useUserPlaylists, useLikedSongs } from '@/hooks/useNostrMusic';
import { useNavigate } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import type { NostrEvent } from '@nostrify/nostrify';
import { CreatePlaylistDialog } from '@/components/music/CreatePlaylistDialog';
import { EditPlaylistDialog } from '@/components/music/EditPlaylistDialog';
import { DeletePlaylistDialog } from '@/components/music/DeletePlaylistDialog';
import { SharePlaylistDialog } from '@/components/music/SharePlaylistDialog';
import { PlaylistCommentDialog } from '@/components/music/PlaylistCommentDialog';


export function MusicPlaylists() {
  const { user } = useCurrentUser();
  const { data: userPlaylists, isLoading: playlistsLoading } = useUserPlaylists();
  const { data: likedSongs, isLoading: likedSongsLoading } = useLikedSongs();
  const navigate = useNavigate();

  const [createPlaylistOpen, setCreatePlaylistOpen] = useState(false);
  const [editPlaylistOpen, setEditPlaylistOpen] = useState(false);
  const [deletePlaylistOpen, setDeletePlaylistOpen] = useState(false);
  const [sharePlaylistOpen, setSharePlaylistOpen] = useState(false);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
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

  const handlePlayLikedSongs = () => {
    // Navigate to the liked songs playlist page using naddr
    if (likedSongs) {
      const dTag = likedSongs.tags.find(tag => tag[0] === 'd')?.[1];
      if (dTag) {
        const naddr = nip19.naddrEncode({
          identifier: dTag,
          pubkey: likedSongs.pubkey,
          kind: likedSongs.kind,
        });
        navigate(`/playlist/${naddr}`);
      }
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

  const handleCommentOnPlaylist = (playlist: NostrEvent) => {
    setSelectedPlaylist(playlist);
    setCommentDialogOpen(true);
  };

  const getLikedSongsInfo = () => {
    if (!likedSongs) return { title: 'Liked Songs', description: 'Your favorite tracks', trackCount: 0 };
    const titleTag = likedSongs.tags.find(tag => tag[0] === 'title');
    const descriptionTag = likedSongs.tags.find(tag => tag[0] === 'description');
    const trackTags = likedSongs.tags.filter(tag => tag[0] === 'r');
    return {
      title: titleTag?.[1] || 'Liked Songs',
      description: descriptionTag?.[1] || 'Your favorite tracks',
      trackCount: trackTags.length,
    };
  };

  const LikedSongsCard = () => {
    const { title, description, trackCount } = getLikedSongsInfo();

    if (!likedSongs) return null;

    return (
      <Card className="group hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start space-x-4">
            {/* Liked Songs Cover */}
            <div className="relative flex-shrink-0">
              <div className="h-16 w-16 rounded-md bg-gradient-to-br from-pink-500 to-red-500 flex items-center justify-center">
                <Heart className="h-8 w-8 text-white fill-current" />
              </div>
              <Button
                size="sm"
                variant="secondary"
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70 text-white border-0"
                onClick={handlePlayLikedSongs}
              >
                <Play className="h-4 w-4" />
              </Button>
            </div>

            {/* Liked Songs Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm truncate">
                {title}
              </h3>
              <p className="text-sm text-muted-foreground truncate mt-1">
                {description}
              </p>

              <div className="flex items-center space-x-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  {trackCount} {trackCount === 1 ? 'track' : 'tracks'}
                </Badge>
              </div>

              {/* Author Info */}
              <div className="flex items-center space-x-2 mt-2">
                <span className="text-xs text-muted-foreground truncate">
                  by You
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  side="bottom"
                  sideOffset={4}
                  alignOffset={-4}
                  avoidCollisions={true}
                  collisionPadding={16}
                  className="min-w-[160px] max-w-[calc(100vw-32px)]"
                >
                  <DropdownMenuItem onClick={handlePlayLikedSongs}>
                    <Play className="h-4 w-4 mr-2" />
                    Play Playlist
                  </DropdownMenuItem>
                  {user && (
                    <DropdownMenuItem onClick={() => handleCommentOnPlaylist(likedSongs)}>
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Comment
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => handleEditPlaylist(likedSongs)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Playlist
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSharePlaylist(likedSongs)}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share Playlist
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>
    );
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
                  <span>{(userPlaylists?.length || 0) + (likedSongs ? 1 : 0)} playlist{((userPlaylists?.length || 0) + (likedSongs ? 1 : 0)) !== 1 ? 's' : ''}</span>
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
      {playlistsLoading || likedSongsLoading ? (
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
      ) : (likedSongs && getLikedSongsInfo().trackCount > 0) || (userPlaylists && userPlaylists.length > 0) ? (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Your Playlists</h2>
              <p className="text-sm text-muted-foreground">
                {(likedSongs && getLikedSongsInfo().trackCount > 0 ? 1 : 0) + (userPlaylists?.length || 0)} playlist{((likedSongs && getLikedSongsInfo().trackCount > 0 ? 1 : 0) + (userPlaylists?.length || 0)) !== 1 ? 's' : ''}
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Liked Songs Card */}
              {likedSongs && getLikedSongsInfo().trackCount > 0 && (
                <LikedSongsCard />
              )}

              {/* Regular Playlists */}
              {userPlaylists?.map((playlist) => (
                <PlaylistCard
                  key={playlist.id}
                  playlist={playlist}
                  onPlay={handlePlayPlaylist}
                  onEdit={handleEditPlaylist}
                  onDelete={handleDeletePlaylist}
                  onShare={handleSharePlaylist}
                  onComment={handleCommentOnPlaylist}
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

      <PlaylistCommentDialog
        open={commentDialogOpen}
        onOpenChange={setCommentDialogOpen}
        playlistEvent={selectedPlaylist}
      />
    </div>
  );
}