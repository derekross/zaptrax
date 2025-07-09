import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Music,
  TrendingUp,
  Search,
  Plus,
  Heart,
  PlayCircle,
} from 'lucide-react';
import { TopTracks } from '@/components/music/TopTracks';
import { MusicSearch } from '@/components/music/MusicSearch';
import { PlaylistCard } from '@/components/music/PlaylistCard';
import { CreatePlaylistDialog } from '@/components/music/CreatePlaylistDialog';
import { ZapDialog } from '@/components/music/ZapDialog';
import { CommentDialog } from '@/components/music/CommentDialog';
import { LoginArea } from '@/components/auth/LoginArea';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useUserPlaylists, useLikedSongs } from '@/hooks/useNostrMusic';
import type { WavlakeTrack, WavlakeSearchResult } from '@/lib/wavlake';
import type { NostrEvent } from '@nostrify/nostrify';

export function MusicHome() {
  const { user } = useCurrentUser();
  const [createPlaylistOpen, setCreatePlaylistOpen] = useState(false);
  const [selectedTrackForPlaylist, setSelectedTrackForPlaylist] = useState<WavlakeTrack | null>(null);
  const [zapDialogOpen, setZapDialogOpen] = useState(false);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [selectedTrackForZap, setSelectedTrackForZap] = useState<WavlakeTrack | null>(null);
  const [selectedTrackForComment, setSelectedTrackForComment] = useState<WavlakeTrack | null>(null);

  const { data: userPlaylists, isLoading: playlistsLoading } = useUserPlaylists();
  const { data: likedSongs, isLoading: likedSongsLoading } = useLikedSongs();

  const handleTrackSelect = (result: WavlakeSearchResult) => {
    // Navigate to track detail or play track
    console.log('Track selected:', result);
  };

  const handleArtistSelect = (result: WavlakeSearchResult) => {
    // Navigate to artist page
    console.log('Artist selected:', result);
  };

  const handleAlbumSelect = (result: WavlakeSearchResult) => {
    // Navigate to album page
    console.log('Album selected:', result);
  };

  const handleAddToPlaylist = (track: WavlakeTrack) => {
    setSelectedTrackForPlaylist(track);
    setCreatePlaylistOpen(true);
  };

  const handleComment = (track: WavlakeTrack) => {
    setSelectedTrackForComment(track);
    setCommentDialogOpen(true);
  };

  const handleZap = (track: WavlakeTrack) => {
    setSelectedTrackForZap(track);
    setZapDialogOpen(true);
  };

  const handlePlayPlaylist = (playlist: NostrEvent) => {
    // Extract track URLs from playlist and play
    const trackTags = playlist.tags.filter(tag => tag[0] === 'r');
    console.log('Play playlist:', playlist, trackTags);
  };

  const getLikedSongsTracks = () => {
    if (!likedSongs) return [];

    const trackTags = likedSongs.tags.filter(tag => tag[0] === 'r');
    return trackTags.map(tag => tag[1]); // URLs
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

  return (
    <div className="min-h-screen bg-background spray-paint">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-primary rounded-none border-2 border-foreground neon-glow">
              <Music className="h-8 w-8 text-primary-foreground" />
            </div>
            <div>
              <h1
                className="punk-title glitch text-primary"
                data-text="ZAPTRAX"
              >
                ZAPTRAX
              </h1>
              <p className="punk-subtitle text-accent">
                PUNK ROCK MUSIC ON NOSTR ⚡
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <ThemeToggle />
            {!user && (
              <LoginArea className="max-w-60" />
            )}
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="discover" className="space-y-8">
          <TabsList className="grid w-full grid-cols-4 bg-card border-2 border-primary punk-card">
            <TabsTrigger
              value="discover"
              className="flex items-center space-x-2 font-bold uppercase tracking-wide data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <TrendingUp className="h-4 w-4" />
              <span>DISCOVER</span>
            </TabsTrigger>
            <TabsTrigger
              value="search"
              className="flex items-center space-x-2 font-bold uppercase tracking-wide data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Search className="h-4 w-4" />
              <span>SEARCH</span>
            </TabsTrigger>
            {user && (
              <>
                <TabsTrigger
                  value="playlists"
                  className="flex items-center space-x-2 font-bold uppercase tracking-wide data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <PlayCircle className="h-4 w-4" />
                  <span>PLAYLISTS</span>
                </TabsTrigger>
                <TabsTrigger
                  value="liked"
                  className="flex items-center space-x-2 font-bold uppercase tracking-wide data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Heart className="h-4 w-4" />
                  <span>LIKED</span>
                </TabsTrigger>
              </>
            )}
          </TabsList>

        {/* Discover Tab */}
        <TabsContent value="discover" className="space-y-6">
          <TopTracks
            onAddToPlaylist={handleAddToPlaylist}
            onComment={handleComment}
            onZap={handleZap}
          />
        </TabsContent>

        {/* Search Tab */}
        <TabsContent value="search" className="space-y-6">
          <MusicSearch
            onTrackSelect={handleTrackSelect}
            onArtistSelect={handleArtistSelect}
            onAlbumSelect={handleAlbumSelect}
          />
        </TabsContent>

        {/* Playlists Tab */}
        {user && (
          <TabsContent value="playlists" className="space-y-6">
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
                    Create Playlist
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

        {/* Liked Songs Tab */}
        {user && (
          <TabsContent value="liked" className="space-y-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-primary border-2 border-foreground neon-glow">
                <Heart className="h-8 w-8 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-2xl font-punk font-black tracking-wider text-primary torn-edge">
                  {getLikedSongsInfo().title.toUpperCase()}
                </h2>
                <p className="font-metal text-accent">
                  {getLikedSongsInfo().description} • {getLikedSongsInfo().trackCount} TRACKS
                </p>
              </div>
            </div>

            {likedSongsLoading ? (
              <div className="space-y-4">
                {[...Array(10)].map((_, i) => (
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
            ) : getLikedSongsTracks().length > 0 ? (
              <div className="space-y-4">
                {getLikedSongsTracks().map((trackUrl, index) => (
                  <div key={trackUrl} className="text-sm text-muted-foreground">
                    {/* Note: In a real implementation, you'd fetch track details from the URL */}
                    Track {index + 1}: {trackUrl}
                  </div>
                ))}
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="py-12 px-8 text-center">
                  <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">No liked songs yet</h3>
                  <p className="text-sm text-muted-foreground">
                    Like songs to see them here
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* Dialogs */}
      <CreatePlaylistDialog
        open={createPlaylistOpen}
        onOpenChange={setCreatePlaylistOpen}
        initialTracks={selectedTrackForPlaylist ? [selectedTrackForPlaylist] : []}
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

        {/* Footer */}
        <div className="text-center pt-8 border-t-2 border-dashed border-primary">
          <p className="font-metal text-accent">
            VIBED WITH{' '}
            <a
              href="https://soapbox.pub/mkstack"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-accent neon-text font-bold"
            >
              MKSTACK
            </a>
            {' '}⚡ PUNK ROCK FOREVER ⚡
          </p>
        </div>
      </div>
    </div>
  );
}