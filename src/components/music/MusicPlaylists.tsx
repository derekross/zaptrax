import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Music, Heart, Play, List } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useUserPlaylists, useLikedSongs } from '@/hooks/useNostrMusic';
import { useNavigate } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import type { NostrEvent } from '@nostrify/nostrify';
import { CreatePlaylistDialog } from '@/components/music/CreatePlaylistDialog';
import { EditPlaylistDialog } from '@/components/music/EditPlaylistDialog';
import { DeletePlaylistDialog } from '@/components/music/DeletePlaylistDialog';
import { SharePlaylistDialog } from '@/components/music/SharePlaylistDialog';

const categories = ['Playlists', 'Podcasts', 'Songs', 'Albums', 'Artists'];

export function MusicPlaylists() {
  const { user } = useCurrentUser();
  const { data: userPlaylists, isLoading: playlistsLoading } = useUserPlaylists();
  const { data: likedSongs, isLoading: likedSongsLoading } = useLikedSongs();
  const navigate = useNavigate();

  const [selectedCategory, setSelectedCategory] = useState('Playlists');
  const [createPlaylistOpen, setCreatePlaylistOpen] = useState(false);
  const [editPlaylistOpen, setEditPlaylistOpen] = useState(false);
  const [deletePlaylistOpen, setDeletePlaylistOpen] = useState(false);
  const [sharePlaylistOpen, setSharePlaylistOpen] = useState(false);
  const [selectedPlaylist] = useState<NostrEvent | null>(null);

  const handlePlayPlaylist = (playlist: NostrEvent) => {
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

  const handleLikedSongsClick = () => {
    navigate('/liked');
  };



  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="text-center py-20">
          <h3 className="font-medium mb-2 text-white">Log in to see your playlists</h3>
          <p className="text-sm text-gray-400 mb-4">
            You need to be logged in to create and view your playlists.
          </p>
        </div>
      </div>
    );
  }

  const likedSongsTrackCount = likedSongs?.tags.filter(tag => tag[0] === 'r').length || 0;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header Section */}
      <div className="flex items-start gap-6 p-6 pb-8">
        {/* Playlists Icon */}
        <div className="flex-shrink-0">
          <div className="h-64 w-64 rounded-lg bg-gradient-to-br from-purple-600 via-purple-700 to-purple-900 flex items-center justify-center shadow-2xl">
            <List className="h-24 w-24 text-white" />
          </div>
        </div>

        {/* Playlist Info */}
        <div className="flex-1 space-y-6 pt-16">
          <div>
            <h1 className="text-6xl font-bold mb-6 text-white">Playlists</h1>
            <div className="flex items-center gap-2 text-gray-300">
              <span className="text-white font-medium">Your Library</span>
              <span>•</span>
              <span>Music Collection</span>
              <span>•</span>
              <span>2025</span>
            </div>
            <div className="mt-2 text-gray-300">
              <span>{userPlaylists?.length || 0} playlists</span>
            </div>
            <p className="text-sm text-gray-400 mt-4 max-w-lg">
              Create and organize your music into playlists. Your personal collections and liked songs are stored here.
            </p>
          </div>

          {/* Category Pills */}
          <div className="flex gap-2">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "ghost"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className={
                  selectedCategory === category
                    ? "bg-purple-600 text-white hover:bg-purple-700 rounded-full px-4"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white rounded-full px-4"
                }
              >
                {category}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="p-6">
        {selectedCategory === 'Playlists' && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {/* Liked Music Card */}
            <div
              onClick={handleLikedSongsClick}
              className="bg-gray-900 hover:bg-gray-800 transition-colors cursor-pointer rounded-lg p-4 group"
            >
              <div className="relative mb-4">
                <div className="aspect-square bg-gradient-to-br from-purple-600 via-purple-700 to-purple-900 rounded-lg flex items-center justify-center">
                  <Heart className="h-12 w-12 text-white fill-current" />
                </div>
                <Button
                  size="sm"
                  className="absolute bottom-2 right-2 h-10 w-10 rounded-full bg-purple-600 hover:bg-purple-700 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0"
                >
                  <Play className="h-4 w-4 fill-white" />
                </Button>
              </div>
              <h3 className="font-medium text-white truncate">Liked Music</h3>
              <p className="text-sm text-gray-400 truncate">
                Auto playlist • {likedSongsTrackCount} song{likedSongsTrackCount !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Create Playlist Card */}
            <div
              onClick={() => setCreatePlaylistOpen(true)}
              className="bg-gray-900 hover:bg-gray-800 transition-colors cursor-pointer rounded-lg p-4 group border-2 border-dashed border-gray-700 hover:border-gray-600"
            >
              <div className="relative mb-4">
                <div className="aspect-square bg-gray-800 rounded-lg flex items-center justify-center">
                  <Plus className="h-12 w-12 text-gray-500" />
                </div>
              </div>
              <h3 className="font-medium text-white truncate">Create playlist</h3>
              <p className="text-sm text-gray-400 truncate">Make your own playlist</p>
            </div>

            {/* User Playlists */}
            {userPlaylists?.map((playlist) => {
              const titleTag = playlist.tags.find(tag => tag[0] === 'title')?.[1] || 'Untitled Playlist';
              const trackTags = playlist.tags.filter(tag => tag[0] === 'r');
              const trackCount = trackTags.length;

              return (
                <div
                  key={playlist.id}
                  className="bg-gray-900 hover:bg-gray-800 transition-colors cursor-pointer rounded-lg p-4 group"
                >
                  <div className="relative mb-4">
                    <div className="aspect-square bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg flex items-center justify-center">
                      <Music className="h-12 w-12 text-gray-400" />
                    </div>
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlayPlaylist(playlist);
                      }}
                      className="absolute bottom-2 right-2 h-10 w-10 rounded-full bg-purple-600 hover:bg-purple-700 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0"
                    >
                      <Play className="h-4 w-4 fill-white" />
                    </Button>
                  </div>
                  <h3 className="font-medium text-white truncate">{titleTag}</h3>
                  <p className="text-sm text-gray-400 truncate">
                    Playlist • {trackCount} song{trackCount !== 1 ? 's' : ''}
                  </p>
                </div>
              );
            })}

            {/* Loading Skeletons */}
            {(playlistsLoading || likedSongsLoading) && (
              <>
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-gray-900 rounded-lg p-4">
                    <div className="aspect-square bg-gray-800 animate-pulse rounded-lg mb-4" />
                    <div className="h-4 bg-gray-800 animate-pulse rounded mb-2" />
                    <div className="h-3 bg-gray-800 animate-pulse rounded w-3/4" />
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* Other Categories - Placeholder */}
        {selectedCategory !== 'Playlists' && (
          <div className="text-center py-20">
            <div className="max-w-sm mx-auto space-y-4">
              <div className="h-16 w-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto">
                <Music className="h-8 w-8 text-gray-600" />
              </div>
              <div>
                <h3 className="font-semibold mb-2 text-white">{selectedCategory} coming soon</h3>
                <p className="text-sm text-gray-400">
                  This section is not yet implemented.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <CreatePlaylistDialog
        open={createPlaylistOpen}
        onOpenChange={setCreatePlaylistOpen}
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