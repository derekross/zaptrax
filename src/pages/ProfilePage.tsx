import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  User,
  Music,
  Copy,
  Globe,
  Disc3,
  ListMusic,
  Play,
} from 'lucide-react';
import { useAuthor } from '@/hooks/useAuthor';
import { useUserPlaylists, useLikedSongs } from '@/hooks/useNostrMusic';
import { useNostrMusicTracksByAuthor, useNostrMusicPlaylists, getNostrTrackNaddr, getNostrPlaylistNaddr } from '@/hooks/useNostrMusicTracks';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { genUserName } from '@/lib/genUserName';
import { nostrTrackToUnified, type NostrMusicTrack } from '@/lib/unifiedTrack';
import { PlaylistCard } from '@/components/music/PlaylistCard';
import { LikedSongsCard } from '@/components/music/LikedSongsCard';
import { CreatePlaylistDialog } from '@/components/music/CreatePlaylistDialog';
import { SharePlaylistDialog } from '@/components/music/SharePlaylistDialog';
import { useToast } from '@/hooks/useToast';
import type { NostrEvent } from '@nostrify/nostrify';
import type { WavlakeTrack } from '@/lib/wavlake';

export function ProfilePage() {
  const { npub } = useParams<{ npub: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useCurrentUser();
  const { toast } = useToast();

  const [clonePlaylistOpen, setClonePlaylistOpen] = useState(false);
  const [sharePlaylistOpen, setSharePlaylistOpen] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<NostrEvent | null>(null);
  const [selectedTracks, setSelectedTracks] = useState<WavlakeTrack[]>([]);

  // Decode npub to get pubkey
  let pubkey: string | null = null;
  let decodeError = false;

  try {
    if (!npub) throw new Error('No npub provided');
    const decoded = nip19.decode(npub);
    if (decoded.type !== 'npub') throw new Error('Invalid npub');
    pubkey = decoded.data;
  } catch {
    decodeError = true;
  }

  // Always call hooks in the same order
  const author = useAuthor(pubkey || undefined);
  const { data: userPlaylists, isLoading: playlistsLoading } = useUserPlaylists(pubkey || undefined);
  const { data: likedSongs, isLoading: likedSongsLoading } = useLikedSongs(pubkey || undefined);
  const { data: nostrMusicTracks, isLoading: nostrTracksLoading } = useNostrMusicTracksByAuthor(pubkey || undefined);
  const { data: nostrMusicPlaylists, isLoading: nostrPlaylistsLoading } = useNostrMusicPlaylists(pubkey || undefined);
  const { playTrack } = useMusicPlayer();

  // Handle decode error after hooks
  if (decodeError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="border-dashed">
          <CardContent className="py-12 px-8 text-center">
            <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">Invalid Profile</h3>
            <p className="text-sm text-muted-foreground mb-4">
              The profile URL is invalid or malformed.
            </p>
            <Button onClick={() => navigate('/')}>
              Go Back to Music
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isOwnProfile = currentUser?.pubkey === pubkey;
  const metadata = author.data?.metadata;
  const displayName = metadata?.display_name || metadata?.name || genUserName(pubkey || '');
  const userName = metadata?.name || genUserName(pubkey || '');

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



  const handleClonePlaylist = async (playlist: NostrEvent) => {
    if (!currentUser) {
      toast({
        title: "Login required",
        description: "You need to be logged in to clone playlists.",
        variant: "destructive",
      });
      return;
    }

    // Extract tracks from playlist
    const trackTags = playlist.tags.filter(tag => tag[0] === 'r' && tag[1]?.includes('wavlake.com/track/'));
    const tracks: WavlakeTrack[] = [];

    // Create track objects from playlist tags
    trackTags.forEach((tag, index) => {
      const url = tag[1];
      const trackId = url.split('/track/')[1];
      if (trackId) {
        tracks.push({
          id: trackId,
          title: `Track ${index + 1}`,
          artist: 'Unknown Artist',
          albumTitle: 'Unknown Album',
          albumArtUrl: '',
          artistId: '',
          albumId: '',
          artistArtUrl: '',
          duration: 0,
          releaseDate: '',
          msatTotal: '0',
          artistNpub: '',
          order: index,
          mediaUrl: '',
        });
      }
    });

    setSelectedTracks(tracks);
    setSelectedPlaylist(playlist);
    setClonePlaylistOpen(true);
  };

  const handleSharePlaylist = (playlist: NostrEvent) => {
    setSelectedPlaylist(playlist);
    setSharePlaylistOpen(true);
  };

  const handleNostrTrackPlay = (track: NostrMusicTrack) => {
    const unifiedTrack = nostrTrackToUnified(track);
    const unifiedQueue = nostrMusicTracks ? nostrMusicTracks.map(nostrTrackToUnified) : [unifiedTrack];
    playTrack(unifiedTrack, unifiedQueue);
  };

  const handleNostrTrackClick = (track: NostrMusicTrack) => {
    const naddr = getNostrTrackNaddr(track);
    navigate(`/track/${naddr}`);
  };

  const handleNostrPlaylistClick = (playlist: Parameters<typeof getNostrPlaylistNaddr>[0]) => {
    const naddr = getNostrPlaylistNaddr(playlist);
    navigate(`/nostr-playlist/${naddr}`);
  };

  const copyProfileUrl = () => {
    const url = `${window.location.origin}/profile/${npub}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Profile URL copied",
      description: "The profile URL has been copied to your clipboard.",
    });
  };



  if (author.isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Profile Header Skeleton */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              <Skeleton className="h-32 w-32 rounded-full mx-auto md:mx-0" />
              <div className="flex-1 space-y-4">
                <div className="text-center md:text-left space-y-2">
                  <Skeleton className="h-8 w-48 mx-auto md:mx-0" />
                  <Skeleton className="h-4 w-32 mx-auto md:mx-0" />
                  <Skeleton className="h-4 w-64 mx-auto md:mx-0" />
                </div>
                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-24" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Playlists Skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-32 w-full rounded-md mb-4" />
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Profile Header */}
      <Card className="bg-gradient-to-r from-purple-500/10 to-purple-600/10 border-purple-200 dark:border-purple-800">
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            {/* Profile Avatar */}
            <div className="h-32 w-32 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Avatar className="h-28 w-28">
                <AvatarImage src={metadata?.picture} alt={displayName} />
                <AvatarFallback className="text-2xl font-semibold bg-transparent text-white">
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Profile Info */}
            <div className="flex-1 space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Profile
                </p>
                <h1 className="text-3xl font-bold mt-1">{displayName}</h1>
                {metadata?.name && metadata.name !== displayName && (
                  <p className="text-lg text-muted-foreground mt-1">
                    @{userName}
                  </p>
                )}
                {metadata?.about && (
                  <p className="text-muted-foreground mt-2 max-w-2xl">
                    {metadata.about}
                  </p>
                )}
              </div>

              {/* Profile Details */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                {metadata?.website && (
                  <div className="flex items-center gap-1">
                    <Globe className="h-4 w-4" />
                    <a
                      href={metadata.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-foreground transition-colors"
                    >
                      Website
                    </a>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <Button
                  onClick={copyProfileUrl}
                  size="lg"
                  className="rounded-full px-8"
                >
                  <Copy className="h-5 w-5 mr-2" />
                  Copy Profile URL
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Playlists Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Music className="h-6 w-6" />
            <h2 className="text-2xl font-semibold">
              {isOwnProfile ? 'Your Playlists' : `${displayName}'s Playlists`}
            </h2>
          </div>
          {(userPlaylists && userPlaylists.length > 0) || (likedSongs && likedSongs.tags.filter(tag => tag[0] === 'r').length > 0) ? (
            <Badge variant="outline">
              {(userPlaylists?.length || 0) + (likedSongs && likedSongs.tags.filter(tag => tag[0] === 'r').length > 0 ? 1 : 0)} {((userPlaylists?.length || 0) + (likedSongs && likedSongs.tags.filter(tag => tag[0] === 'r').length > 0 ? 1 : 0)) === 1 ? 'Playlist' : 'Playlists'}
            </Badge>
          ) : null}
        </div>

        {playlistsLoading || likedSongsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-32 w-full rounded-md mb-4" />
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (userPlaylists && userPlaylists.length > 0) || (likedSongs && likedSongs.tags.filter(tag => tag[0] === 'r').length > 0) ? (
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Show Liked Songs first if it has tracks */}
                {likedSongs && likedSongs.tags.filter(tag => tag[0] === 'r').length > 0 && (
                  <LikedSongsCard
                    key="liked-songs"
                    likedSongs={likedSongs}
                    pubkey={pubkey || ''}
                    onShare={handleSharePlaylist}
                    onClone={!isOwnProfile ? handleClonePlaylist : undefined}
                    showCloneButton={!isOwnProfile && !!currentUser}
                  />
                )}
                {/* Show regular playlists */}
                {userPlaylists?.map((playlist) => (
                  <PlaylistCard
                    key={playlist.id}
                    playlist={playlist}
                    onPlay={handlePlayPlaylist}
                    onShare={handleSharePlaylist}
                    onClone={!isOwnProfile ? handleClonePlaylist : undefined}
                    showCloneButton={!isOwnProfile && !!currentUser}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-12 px-8 text-center">
              <Music className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">
                {isOwnProfile ? 'No playlists yet' : 'No public playlists'}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {isOwnProfile
                  ? 'Create your first playlist to get started.'
                  : `${displayName} hasn't created any public playlists yet.`
                }
              </p>
              {isOwnProfile && (
                <Button onClick={() => navigate('/playlists')}>
                  Create Your First Playlist
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Nostr Music Tracks Section */}
      {(nostrMusicTracks && nostrMusicTracks.length > 0) || nostrTracksLoading ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Disc3 className="h-6 w-6 text-purple-500" />
              <h2 className="text-2xl font-semibold">
                {isOwnProfile ? 'Your Music' : `${displayName}'s Music`}
              </h2>
            </div>
            {nostrMusicTracks && nostrMusicTracks.length > 0 && (
              <Badge variant="outline" className="border-purple-500/50 text-purple-400">
                {nostrMusicTracks.length} {nostrMusicTracks.length === 1 ? 'Track' : 'Tracks'}
              </Badge>
            )}
          </div>

          {nostrTracksLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="bg-gray-900 border-gray-800">
                  <CardContent className="p-0">
                    <Skeleton className="w-full aspect-square rounded-t-lg" />
                    <div className="p-3 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-gray-900/50 border-gray-800">
              <CardContent className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {nostrMusicTracks?.map((track) => (
                    <Card
                      key={track.event.id}
                      className="bg-gray-900 border-gray-800 hover:bg-gray-800 transition-colors cursor-pointer group"
                      onClick={() => handleNostrTrackClick(track)}
                    >
                      <CardContent className="p-0">
                        <div className="relative">
                          {track.image ? (
                            <img
                              src={track.image}
                              alt={track.title}
                              className="w-full aspect-square object-cover rounded-t-lg"
                            />
                          ) : (
                            <div className="w-full aspect-square bg-gradient-to-br from-purple-600 to-purple-900 rounded-t-lg flex items-center justify-center">
                              <Disc3 className="h-12 w-12 text-white/60" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-t-lg flex items-center justify-center">
                            <Button
                              size="sm"
                              className="bg-purple-600 hover:bg-purple-700 text-white rounded-full"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNostrTrackPlay(track);
                              }}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="absolute top-2 right-2 bg-purple-600/90 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                            Nostr
                          </div>
                        </div>
                        <div className="p-3">
                          <p className="text-white font-medium text-sm truncate">{track.title}</p>
                          <p className="text-gray-400 text-xs truncate">{track.artist}</p>
                          {track.album && (
                            <p className="text-gray-500 text-xs truncate mt-0.5">{track.album}</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : null}

      {/* Nostr Music Playlists Section */}
      {(nostrMusicPlaylists && nostrMusicPlaylists.length > 0) || nostrPlaylistsLoading ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ListMusic className="h-6 w-6 text-purple-500" />
              <h2 className="text-2xl font-semibold">
                {isOwnProfile ? 'Your Nostr Playlists' : `${displayName}'s Nostr Playlists`}
              </h2>
            </div>
            {nostrMusicPlaylists && nostrMusicPlaylists.length > 0 && (
              <Badge variant="outline" className="border-purple-500/50 text-purple-400">
                {nostrMusicPlaylists.length} {nostrMusicPlaylists.length === 1 ? 'Playlist' : 'Playlists'}
              </Badge>
            )}
          </div>

          {nostrPlaylistsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="bg-gray-900 border-gray-800">
                  <CardContent className="p-0">
                    <Skeleton className="w-full aspect-square rounded-t-lg" />
                    <div className="p-3 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-gray-900/50 border-gray-800">
              <CardContent className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {nostrMusicPlaylists?.map((playlist) => (
                    <Card
                      key={playlist.event.id}
                      className="bg-gray-900 border-gray-800 hover:bg-gray-800 transition-colors cursor-pointer group"
                      onClick={() => handleNostrPlaylistClick(playlist)}
                    >
                      <CardContent className="p-0">
                        <div className="relative">
                          {playlist.image ? (
                            <img
                              src={playlist.image}
                              alt={playlist.title}
                              className="w-full aspect-square object-cover rounded-t-lg"
                            />
                          ) : (
                            <div className="w-full aspect-square bg-gradient-to-br from-purple-600 to-purple-800 rounded-t-lg flex items-center justify-center">
                              <ListMusic className="h-12 w-12 text-white/60" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-t-lg flex items-center justify-center">
                            <Button
                              size="sm"
                              className="bg-purple-600 hover:bg-purple-700 text-white rounded-full"
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="p-3">
                          <p className="text-white font-medium text-sm truncate">{playlist.title}</p>
                          <p className="text-gray-400 text-xs truncate">
                            {playlist.trackRefs.length} tracks
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : null}

      {/* Clone Playlist Dialog */}
      <CreatePlaylistDialog
        open={clonePlaylistOpen}
        onOpenChange={setClonePlaylistOpen}
        initialTracks={selectedTracks}
        title={selectedPlaylist ? `Clone "${selectedPlaylist.tags.find(t => t[0] === 'title')?.[1] || 'Untitled'}"` : undefined}
      />

      {/* Share Playlist Dialog */}
      <SharePlaylistDialog
        open={sharePlaylistOpen}
        onOpenChange={setSharePlaylistOpen}
        playlist={selectedPlaylist}
      />
    </div>
  );
}