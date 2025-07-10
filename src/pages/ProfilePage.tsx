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
  ExternalLink,
  Calendar,
  Globe
} from 'lucide-react';
import { useAuthor } from '@/hooks/useAuthor';
import { useUserPlaylists } from '@/hooks/useNostrMusic';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { genUserName } from '@/lib/genUserName';
import { PlaylistCard } from '@/components/music/PlaylistCard';
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

  const copyProfileUrl = () => {
    const url = `${window.location.origin}/profile/${npub}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Profile URL copied",
      description: "The profile URL has been copied to your clipboard.",
    });
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (author.isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-8">
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
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Profile Header */}
      <Card className="punk-card border-2 border-primary">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0 mx-auto md:mx-0">
              <Avatar className="h-32 w-32 border-4 border-primary">
                <AvatarImage src={metadata?.picture} alt={displayName} />
                <AvatarFallback className="text-2xl font-punk bg-primary text-primary-foreground">
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Profile Info */}
            <div className="flex-1 space-y-4">
              <div className="text-center md:text-left">
                <h1 className="text-3xl font-punk tracking-wider text-primary mb-2">
                  {displayName}
                </h1>
                {metadata?.name && metadata.name !== displayName && (
                  <p className="text-lg text-muted-foreground font-metal">
                    @{userName}
                  </p>
                )}
                {metadata?.about && (
                  <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
                    {metadata.about}
                  </p>
                )}
              </div>

              {/* Profile Details */}
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground justify-center md:justify-start">
                {metadata?.website && (
                  <div className="flex items-center gap-1">
                    <Globe className="h-4 w-4" />
                    <a
                      href={metadata.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary transition-colors"
                    >
                      Website
                    </a>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>Joined {formatDate(author.data?.event?.created_at || Date.now() / 1000)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyProfileUrl}
                  className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Profile URL
                </Button>
                {metadata?.website && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(metadata.website, '_blank')}
                    className="border-accent text-accent hover:bg-accent hover:text-accent-foreground"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Visit Website
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Playlists Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Music className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-punk tracking-wider text-primary">
              {isOwnProfile ? 'YOUR PLAYLISTS' : `${displayName.toUpperCase()}'S PLAYLISTS`}
            </h2>
          </div>
          {userPlaylists && userPlaylists.length > 0 && (
            <Badge variant="outline" className="border-primary text-primary font-bold">
              {userPlaylists.length} {userPlaylists.length === 1 ? 'Playlist' : 'Playlists'}
            </Badge>
          )}
        </div>

        {playlistsLoading ? (
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
        ) : userPlaylists && userPlaylists.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userPlaylists.map((playlist) => (
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