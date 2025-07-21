import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Play,
  Music,
  MoreHorizontal,
  Edit,
  Share2,
  Trash2,
  Copy,
  Calendar,
  MessageCircle,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNostr } from '@nostrify/react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { useAuthor } from '@/hooks/useAuthor';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { genUserName } from '@/lib/genUserName';
import { nip19 } from 'nostr-tools';
import { wavlakeAPI } from '@/lib/wavlake';
import type { WavlakeTrack } from '@/lib/wavlake';
import { PlaylistTrackItem } from '@/components/music/PlaylistTrackList';
import { EditPlaylistDialog } from '@/components/music/EditPlaylistDialog';
import { DeletePlaylistDialog } from '@/components/music/DeletePlaylistDialog';
import { SharePlaylistDialog } from '@/components/music/SharePlaylistDialog';
import { CreatePlaylistDialog } from '@/components/music/CreatePlaylistDialog';
import { PlaylistCommentDialog } from '@/components/music/PlaylistCommentDialog';
import { RelaySelector } from '@/components/RelaySelector';
import { useState } from 'react';
import { useToast } from '@/hooks/useToast';

export function PlaylistPage() {
  const { nip19Id } = useParams<{ nip19Id: string }>();
  const navigate = useNavigate();
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { playTrack } = useMusicPlayer();

  const [editPlaylistOpen, setEditPlaylistOpen] = useState(false);
  const [deletePlaylistOpen, setDeletePlaylistOpen] = useState(false);
  const [sharePlaylistOpen, setSharePlaylistOpen] = useState(false);
  const [clonePlaylistOpen, setClonePlaylistOpen] = useState(false);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const { toast } = useToast();

  // Decode the NIP-19 identifier
  const decodedData = React.useMemo(() => {
    if (!nip19Id) return null;

    try {
      const decoded = nip19.decode(nip19Id);
      if (decoded.type === 'naddr') {
        return decoded.data;
      }
    } catch (error) {
      console.error('Failed to decode nip19 identifier:', error);
    }
    return null;
  }, [nip19Id]);

  // Fetch the playlist event
  const { data: playlist, isLoading, error } = useQuery({
    queryKey: ['playlist', decodedData?.pubkey, decodedData?.kind, decodedData?.identifier],
    queryFn: async (c) => {
      if (!decodedData) return null;

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      const events = await nostr.query([
        {
          kinds: [decodedData.kind],
          authors: [decodedData.pubkey],
          '#d': [decodedData.identifier],
        }
      ], { signal });

      return events.sort((a, b) => b.created_at - a.created_at)[0] || null;
    },
    enabled: !!decodedData,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const author = useAuthor(playlist?.pubkey);
  const metadata = author.data?.metadata;

  // Get track URLs from playlist
  const getPlaylistTrackUrls = () => {
    if (!playlist) return [];
    const trackTags = playlist.tags.filter(tag => tag[0] === 'r');
    return trackTags.map(tag => tag[1]); // URLs
  };

  const playlistTrackUrls = getPlaylistTrackUrls();

  // Fetch all track data for the playlist
  const allPlaylistTracksData = useQueries({
    queries: playlistTrackUrls.map(url => {
      const trackId = url.substring(url.lastIndexOf('/') + 1);
      return {
        queryKey: ['wavlake-track', trackId],
        queryFn: () => wavlakeAPI.getTrack(trackId),
        enabled: !!trackId,
        staleTime: 30 * 60 * 1000,
      };
    }),
  });

  const allPlaylistTracks: WavlakeTrack[] = allPlaylistTracksData
    .filter(query => query.isSuccess && query.data)
    .map(query => (Array.isArray(query.data) ? query.data[0] : query.data));

  const allPlaylistTracksLoading = allPlaylistTracksData.some(query => query.isLoading);

  const getPlaylistInfo = () => {
    if (!playlist) return { title: '', description: '', trackCount: 0 };

    const titleTag = playlist.tags.find(tag => tag[0] === 'title');
    const descriptionTag = playlist.tags.find(tag => tag[0] === 'description');
    const trackTags = playlist.tags.filter(tag => tag[0] === 'r');

    return {
      title: titleTag?.[1] || 'Untitled Playlist',
      description: descriptionTag?.[1] || '',
      trackCount: trackTags.length,
    };
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const handlePlayPlaylist = () => {
    if (allPlaylistTracks.length > 0) {
      // Play the first track in the playlist with the full playlist as context
      playTrack(allPlaylistTracks[0], allPlaylistTracks);
    }
  };

  const handlePlayTrack = (trackUrl: string) => {
    // Find the track in our loaded tracks
    const trackId = trackUrl.substring(trackUrl.lastIndexOf('/') + 1);
    const track = allPlaylistTracks.find(t => t.id === trackId);

    if (track && allPlaylistTracks.length > 0) {
      playTrack(track, allPlaylistTracks);
    }
  };

  const handleEditPlaylist = () => {
    setEditPlaylistOpen(true);
  };

  const handleDeletePlaylist = () => {
    setDeletePlaylistOpen(true);
  };

  const handleSharePlaylist = () => {
    setSharePlaylistOpen(true);
  };

  const handleClonePlaylist = () => {
    if (!user) {
      toast({
        title: "Login required",
        description: "You need to be logged in to clone playlists.",
        variant: "destructive",
      });
      return;
    }
    setClonePlaylistOpen(true);
  };

  const handleCommentOnPlaylist = () => {
    setCommentDialogOpen(true);
  };

  const handleAuthorClick = () => {
    if (playlist?.pubkey) {
      const npub = nip19.npubEncode(playlist.pubkey);
      navigate(`/profile/${npub}`);
    }
  };

  if (!nip19Id || !decodedData) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 px-8 text-center">
          <h3 className="font-medium mb-2">Invalid playlist link</h3>
          <p className="text-sm text-muted-foreground">
            The playlist link you're trying to access is invalid or malformed.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 px-8 text-center">
          <div className="max-w-sm mx-auto space-y-6">
            <div>
              <h3 className="font-medium mb-2">Failed to load playlist</h3>
              <p className="text-sm text-muted-foreground">
                Could not load the playlist. Try switching to a different relay?
              </p>
            </div>
            <RelaySelector className="w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-4 flex-1">
                <Skeleton className="h-24 w-24 rounded-md" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-64" />
                  <div className="flex items-center space-x-2 mt-2">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Skeleton className="h-9 w-20" />
                <Skeleton className="h-9 w-9" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
    );
  }

  if (!playlist) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 px-8 text-center">
          <div className="max-w-sm mx-auto space-y-6">
            <div>
              <h3 className="font-medium mb-2">Playlist not found</h3>
              <p className="text-sm text-muted-foreground">
                This playlist doesn't exist or hasn't been published yet. Try switching relays?
              </p>
            </div>
            <RelaySelector className="w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const { title, description, trackCount } = getPlaylistInfo();
  const displayName = metadata?.name ?? genUserName(playlist.pubkey);
  const profileImage = metadata?.picture;
  const isOwner = user?.pubkey === playlist.pubkey;





  return (
    <div className="space-y-6">
      {/* Header Section */}
      <Card className="bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border-purple-200 dark:border-purple-800">
        <CardContent className="p-6 relative">
          {/* Creation Date - Top Right */}
          <div className="absolute top-4 right-4 flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>{formatDate(playlist.created_at)}</span>
          </div>

          <div className="flex items-start gap-6">
            {/* Playlist Cover */}
            <div className="h-32 w-32 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center shadow-lg">
              <Music className="h-16 w-16 text-white" />
            </div>

            {/* Playlist Info */}
            <div className="flex-1 space-y-4 pr-20">
              <div>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Playlist
                </p>
                <h1 className="text-3xl font-bold mt-1">{title}</h1>
                {description && (
                  <p className="text-muted-foreground mt-2">
                    {description}
                  </p>
                )}
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Music className="h-4 w-4" />
                  <span>{trackCount} track{trackCount !== 1 ? 's' : ''}</span>
                </div>
                <button
                  onClick={handleAuthorClick}
                  className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
                >
                  <Avatar className="h-4 w-4">
                    <AvatarImage src={profileImage} alt={displayName} />
                    <AvatarFallback className="text-xs">
                      {displayName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span>by {displayName}</span>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2 flex-wrap">
                <Button
                  onClick={handlePlayPlaylist}
                  disabled={allPlaylistTracksLoading || allPlaylistTracks.length === 0}
                  size="lg"
                  className="rounded-full px-8"
                >
                  <Play className="h-5 w-5 mr-2" />
                  {allPlaylistTracksLoading ? 'Loading...' : 'Play'}
                </Button>

                {user && (
                  <Button
                    onClick={handleCommentOnPlaylist}
                    size="lg"
                    variant="outline"
                    className="rounded-full"
                  >
                    <MessageCircle className="h-5 w-5 mr-2" />
                    Comment
                  </Button>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="lg" variant="outline" className="rounded-full">
                      <MoreHorizontal className="h-5 w-5 mr-2" />
                      More
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {isOwner && (
                      <DropdownMenuItem onClick={handleEditPlaylist}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Playlist
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={handleSharePlaylist}>
                      <Share2 className="h-4 w-4 mr-2" />
                      Share Playlist
                    </DropdownMenuItem>
                    {!isOwner && user && (
                      <DropdownMenuItem onClick={handleClonePlaylist}>
                        <Copy className="h-4 w-4 mr-2" />
                        Clone Playlist
                      </DropdownMenuItem>
                    )}
                    {isOwner && (
                      <DropdownMenuItem
                        onClick={handleDeletePlaylist}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Playlist
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Track List */}
      {isLoading || allPlaylistTracksLoading ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-16" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3 p-2 rounded-md">
                <Skeleton className="h-4 w-6" />
                <Skeleton className="h-10 w-10 rounded" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-8 w-8" />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : playlistTrackUrls.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Tracks</h2>
              <p className="text-sm text-muted-foreground">{trackCount} tracks</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {playlistTrackUrls.map((trackUrl, index) => (
              <PlaylistTrackItem
                key={`${trackUrl}-${index}`}
                trackUrl={trackUrl}
                index={index}
                onPlay={handlePlayTrack}
                showDetails={true}
              />
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-16 px-8 text-center">
            <div className="max-w-sm mx-auto space-y-4">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                <Music className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold mb-2">No tracks in this playlist</h3>
                <p className="text-sm text-muted-foreground">
                  This playlist is empty. Add some tracks to get started.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <EditPlaylistDialog
        open={editPlaylistOpen}
        onOpenChange={setEditPlaylistOpen}
        playlist={playlist}
      />

      <DeletePlaylistDialog
        open={deletePlaylistOpen}
        onOpenChange={setDeletePlaylistOpen}
        playlist={playlist}
      />

      <SharePlaylistDialog
        open={sharePlaylistOpen}
        onOpenChange={setSharePlaylistOpen}
        playlist={playlist}
      />

      <CreatePlaylistDialog
        open={clonePlaylistOpen}
        onOpenChange={setClonePlaylistOpen}
        initialTracks={allPlaylistTracks}
        title={title}
      />

      <PlaylistCommentDialog
        open={commentDialogOpen}
        onOpenChange={setCommentDialogOpen}
        playlistEvent={playlist}
      />
    </div>
  );
}