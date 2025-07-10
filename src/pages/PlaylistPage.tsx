import React from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Play,
  Music,
  Calendar,
  MoreHorizontal,
  Edit,
  Share2,
  Trash2,
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
import { RelaySelector } from '@/components/RelaySelector';
import { useState } from 'react';

export function PlaylistPage() {
  const { nip19Id } = useParams<{ nip19Id: string }>();
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { playTrack } = useMusicPlayer();

  const [editPlaylistOpen, setEditPlaylistOpen] = useState(false);
  const [deletePlaylistOpen, setDeletePlaylistOpen] = useState(false);
  const [sharePlaylistOpen, setSharePlaylistOpen] = useState(false);

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

  if (!nip19Id || !decodedData) {
    return (
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <Card className="border-dashed">
          <CardContent className="py-12 px-8 text-center">
            <h3 className="font-medium mb-2">Invalid playlist link</h3>
            <p className="text-sm text-muted-foreground">
              The playlist link you're trying to access is invalid or malformed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
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
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
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
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
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
      </div>
    );
  }

  const { title, description, trackCount } = getPlaylistInfo();
  const displayName = metadata?.name ?? genUserName(playlist.pubkey);
  const profileImage = metadata?.picture;
  const isOwner = user?.pubkey === playlist.pubkey;

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  // Generate a placeholder image based on playlist title
  const getPlaylistImage = () => {
    const colors = [
      'bg-gradient-to-br from-purple-500 to-pink-500',
      'bg-gradient-to-br from-blue-500 to-cyan-500',
      'bg-gradient-to-br from-green-500 to-emerald-500',
      'bg-gradient-to-br from-orange-500 to-red-500',
      'bg-gradient-to-br from-indigo-500 to-purple-500',
    ];
    const colorIndex = title.length % colors.length;
    return colors[colorIndex];
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-4 sm:space-x-6 flex-1">
              {/* Playlist Cover */}
              <div className={`h-16 w-16 sm:h-24 sm:w-24 rounded-md flex items-center justify-center ${getPlaylistImage()}`}>
                <Music className="h-8 w-8 sm:h-12 sm:w-12 text-white" />
              </div>

              {/* Playlist Info */}
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold truncate">{title}</h1>
                {description && (
                  <p className="text-muted-foreground mt-1 text-sm sm:text-base">{description}</p>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 mt-3">
                  <Badge variant="outline" className="w-fit">
                    {trackCount} track{trackCount !== 1 ? 's' : ''}
                  </Badge>
                  <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(playlist.created_at)}</span>
                  </div>
                </div>

                {/* Author Info */}
                <div className="flex items-center space-x-2 mt-3">
                  <Avatar className="h-5 w-5 sm:h-6 sm:w-6">
                    <AvatarImage src={profileImage} alt={displayName} />
                    <AvatarFallback className="text-xs">
                      {displayName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-muted-foreground">
                    by {displayName}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between sm:justify-end space-x-2 w-full sm:w-auto">
              <Button
                onClick={handlePlayPlaylist}
                disabled={allPlaylistTracksLoading || allPlaylistTracks.length === 0}
                className="flex-1 sm:flex-none"
              >
                <Play className="h-4 w-4 mr-2" />
                {allPlaylistTracksLoading ? 'Loading...' : 'Play'}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className="h-9 w-9 p-0 flex-shrink-0">
                    <MoreHorizontal className="h-4 w-4" />
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
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          {isLoading || allPlaylistTracksLoading ? (
            <div className="space-y-2">
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
            </div>
          ) : playlistTrackUrls.length > 0 ? (
            <div className="space-y-1">
              {playlistTrackUrls.map((trackUrl, index) => (
                <PlaylistTrackItem
                  key={`${trackUrl}-${index}`}
                  trackUrl={trackUrl}
                  index={index}
                  onPlay={handlePlayTrack}
                  showDetails={true}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Music className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No tracks in this playlist</p>
            </div>
          )}
        </CardContent>
      </Card>

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
    </div>
  );
}