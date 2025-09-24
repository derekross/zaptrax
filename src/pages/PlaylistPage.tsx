import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Play,
  Pause,
  Music,
  MoreHorizontal,
  Edit,
  Share2,
  Trash2,
  Copy,
  Heart,
  MessageCircle,
  ListPlus,
  ExternalLink,
  Clock,
} from 'lucide-react';
import { useNostr } from '@nostrify/react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { useAuthor } from '@/hooks/useAuthor';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { genUserName } from '@/lib/genUserName';
import { nip19 } from 'nostr-tools';
import { wavlakeAPI } from '@/lib/wavlake';
import type { WavlakeTrack } from '@/lib/wavlake';
import { EditPlaylistDialog } from '@/components/music/EditPlaylistDialog';
import { DeletePlaylistDialog } from '@/components/music/DeletePlaylistDialog';
import { SharePlaylistDialog } from '@/components/music/SharePlaylistDialog';
import { CreatePlaylistDialog } from '@/components/music/CreatePlaylistDialog';
import { PlaylistCommentDialog } from '@/components/music/PlaylistCommentDialog';
import { useToast } from '@/hooks/useToast';

export function PlaylistPage() {
  const { nip19Id } = useParams<{ nip19Id: string }>();
  const navigate = useNavigate();
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { state, playTrack, addToQueue, togglePlayPause } = useMusicPlayer();
  const { toast } = useToast();

  const [editPlaylistOpen, setEditPlaylistOpen] = useState(false);
  const [deletePlaylistOpen, setDeletePlaylistOpen] = useState(false);
  const [sharePlaylistOpen, setSharePlaylistOpen] = useState(false);
  const [clonePlaylistOpen, setClonePlaylistOpen] = useState(false);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);

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
      if (isPlaylistPlaying()) {
        togglePlayPause();
      } else {
        playTrack(allPlaylistTracks[0], allPlaylistTracks);
      }
    }
  };

  const isPlaylistPlaying = () => {
    if (!state.currentTrack || allPlaylistTracks.length === 0) return false;
    return allPlaylistTracks.some(track => track.id === state.currentTrack?.id) && state.isPlaying;
  };

  const handlePlayTrack = (track: WavlakeTrack) => {
    if (allPlaylistTracks.length > 0) {
      playTrack(track, allPlaylistTracks);
    }
  };

  const handleAuthorClick = () => {
    if (playlist?.pubkey) {
      const npub = nip19.npubEncode(playlist.pubkey);
      navigate(`/profile/${npub}`);
    }
  };

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link copied",
      description: "Playlist link copied to clipboard",
    });
  };

  const handleShare = async () => {
    const url = window.location.href;
    const shareData = {
      title: getPlaylistInfo().title,
      text: `Check out this playlist on ZapTrax`,
      url: url,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        handleCopyLink();
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleAddToQueue = () => {
    if (allPlaylistTracks.length > 0) {
      allPlaylistTracks.forEach(track => addToQueue(track));
      toast({
        title: "Added to queue",
        description: `Added ${allPlaylistTracks.length} tracks to queue`,
      });
    }
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

  // Calculate total duration
  const totalDuration = allPlaylistTracks.reduce((sum, track) => sum + (track.duration || 0), 0);
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours} hr ${minutes} min`;
    }
    return `${minutes} min ${secs} sec`;
  };

  if (!nip19Id || !decodedData) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Invalid playlist link</h1>
          <p className="text-gray-400">The playlist link you're trying to access is invalid or malformed.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="relative h-[400px] overflow-hidden">
          <Skeleton className="w-full h-full bg-gray-800" />
        </div>
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="space-y-4">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full bg-gray-800" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !playlist) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Playlist not found</h1>
          <p className="text-gray-400">This playlist doesn't exist or hasn't been published yet.</p>
        </div>
      </div>
    );
  }

  const { title, description, trackCount } = getPlaylistInfo();
  const displayName = metadata?.name ?? genUserName(playlist.pubkey);
  const profileImage = metadata?.picture;
  const isOwner = user?.pubkey === playlist.pubkey;

  // Get first track's album art for playlist cover
  const playlistCoverUrl = allPlaylistTracks[0]?.albumArtUrl;

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Hero Section */}
      <div className="relative h-[400px] overflow-hidden">
        {/* Background Image */}
        {playlistCoverUrl && (
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url(${playlistCoverUrl})`,
              filter: 'blur(20px) brightness(0.3)',
              transform: 'scale(1.1)'
            }}
          />
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />

        {/* Playlist Info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center md:items-end gap-4 md:gap-6">
            {/* Playlist Cover */}
            <div className="w-40 h-40 md:w-60 md:h-60 rounded-lg shadow-2xl flex-shrink-0 bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center">
              {playlistCoverUrl ? (
                <img
                  src={playlistCoverUrl}
                  alt={title}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <Music className="h-16 w-16 md:h-24 md:w-24 text-white" />
              )}
            </div>

            {/* Playlist Details */}
            <div className="flex-1 text-center md:text-left md:pb-4">
              <p className="text-sm text-gray-300 mb-2">Playlist</p>
              <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-3 md:mb-4">{title}</h1>

              {description && (
                <p className="text-gray-300 mb-4 max-w-2xl">{description}</p>
              )}

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-sm text-gray-300 mb-4 md:mb-6">
                <button
                  onClick={handleAuthorClick}
                  className="hover:text-white transition-colors font-medium"
                >
                  {displayName}
                </button>
                <span>•</span>
                <span>{formatDate(playlist.created_at)}</span>
                <span>•</span>
                <span>{trackCount} songs, {formatDuration(totalDuration)}</span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
                <Button
                  size="lg"
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 md:px-8 py-2 md:py-3 rounded-full font-medium w-full sm:w-auto"
                  onClick={handlePlayPlaylist}
                  disabled={allPlaylistTracksLoading || allPlaylistTracks.length === 0}
                >
                  {isPlaylistPlaying() ? (
                    <Pause className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                  ) : (
                    <Play className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                  )}
                  {isPlaylistPlaying() ? 'Pause' : 'Play'}
                </Button>

                {user && (
                  <Button
                    variant="ghost"
                    size="lg"
                    className="text-gray-400 hover:text-purple-400 hover:bg-purple-900/20 p-2 md:p-3 rounded-full"
                    onClick={() => setCommentDialogOpen(true)}
                  >
                    <MessageCircle className="h-5 w-5 md:h-6 md:w-6" />
                  </Button>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="lg"
                      className="text-gray-400 hover:text-purple-400 hover:bg-purple-900/20 p-3 rounded-full"
                    >
                      <MoreHorizontal className="h-6 w-6" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-gray-900 border-gray-800">
                    {isOwner && (
                      <>
                        <DropdownMenuItem
                          onClick={() => setEditPlaylistOpen(true)}
                          className="hover:bg-purple-900/20 hover:text-purple-400"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Playlist
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-gray-800" />
                      </>
                    )}
                    <DropdownMenuItem
                      onClick={handleAddToQueue}
                      className="hover:bg-purple-900/20 hover:text-purple-400"
                    >
                      <ListPlus className="h-4 w-4 mr-2" />
                      Add to Queue
                    </DropdownMenuItem>
                    {!isOwner && user && (
                      <DropdownMenuItem
                        onClick={handleClonePlaylist}
                        className="hover:bg-purple-900/20 hover:text-purple-400"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Clone Playlist
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={handleShare}
                      className="hover:bg-purple-900/20 hover:text-purple-400"
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleCopyLink}
                      className="hover:bg-purple-900/20 hover:text-purple-400"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Link
                    </DropdownMenuItem>
                    {isOwner && (
                      <>
                        <DropdownMenuSeparator className="bg-gray-800" />
                        <DropdownMenuItem
                          onClick={() => setDeletePlaylistOpen(true)}
                          className="text-red-500 hover:bg-red-900/20 hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Playlist
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Track List */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8">
        {/* Track List Header */}
        {allPlaylistTracks.length > 0 && (
          <div className="grid grid-cols-12 gap-4 px-4 py-2 text-sm text-gray-400 border-b border-gray-800 mb-4">
            <div className="col-span-1 text-center">#</div>
            <div className="col-span-5">Title</div>
            <div className="col-span-3">Album</div>
            <div className="col-span-2">Date added</div>
            <div className="col-span-1 text-center">
              <Clock className="h-4 w-4 mx-auto" />
            </div>
          </div>
        )}

        {/* Tracks */}
        <div className="space-y-2">
          {allPlaylistTracksLoading ? (
            // Loading state
            [...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center p-3 rounded-lg">
                <Skeleton className="h-4 w-8 mr-4 bg-gray-800" />
                <Skeleton className="h-12 w-12 rounded mr-4 bg-gray-800" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48 bg-gray-800" />
                  <Skeleton className="h-3 w-32 bg-gray-800" />
                </div>
                <Skeleton className="h-4 w-12 bg-gray-800" />
              </div>
            ))
          ) : allPlaylistTracks.length > 0 ? (
            allPlaylistTracks.map((track, index) => (
              <div
                key={`${track.id}-${index}`}
                className="grid grid-cols-12 gap-4 p-3 rounded-lg hover:bg-gray-900/50 transition-colors group cursor-pointer items-center"
                onClick={() => handlePlayTrack(track)}
              >
                {/* Track Number / Play Button */}
                <div className="col-span-1 text-center">
                  <span className="text-gray-400 group-hover:hidden text-sm">
                    {index + 1}
                  </span>
                  <Play className="h-4 w-4 text-white hidden group-hover:block mx-auto" />
                </div>

                {/* Track Info */}
                <div className="col-span-5 flex items-center gap-3">
                  <img
                    src={track.albumArtUrl}
                    alt={track.title}
                    className="h-10 w-10 rounded"
                  />
                  <div className="min-w-0">
                    <div className="text-white font-medium truncate">{track.title}</div>
                    <div
                      className="text-gray-400 text-sm truncate hover:text-purple-400 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/artist/${track.artistId}`);
                      }}
                    >
                      {track.artist}
                    </div>
                  </div>
                </div>

                {/* Album */}
                <div className="col-span-3 flex items-center">
                  <span
                    className="text-gray-400 text-sm truncate hover:text-purple-400 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (track.albumId) {
                        navigate(`/album/${track.albumId}`);
                      }
                    }}
                  >
                    {track.albumTitle}
                  </span>
                </div>

                {/* Date Added */}
                <div className="col-span-2 flex items-center">
                  <span className="text-gray-400 text-sm">
                    {formatDate(playlist.created_at)}
                  </span>
                </div>

                {/* Duration */}
                <div className="col-span-1 text-center text-gray-400 text-sm">
                  {track.duration ? `${Math.floor(track.duration / 60)}:${(track.duration % 60).toString().padStart(2, '0')}` : '--:--'}
                </div>

                {/* Actions */}
                <div className="absolute right-8 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-400 hover:text-purple-400 p-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Like track action
                          }}
                        >
                          <Heart className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Like track</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-purple-400 p-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-gray-900 border-gray-800">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          addToQueue(track);
                          toast({
                            title: "Added to queue",
                            description: `"${track.title}" added to queue`,
                          });
                        }}
                        className="hover:bg-purple-900/20 hover:text-purple-400"
                      >
                        <ListPlus className="h-4 w-4 mr-2" />
                        Add to Queue
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`https://wavlake.com/track/${track.id}`, '_blank');
                        }}
                        className="hover:bg-purple-900/20 hover:text-purple-400"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View on Wavlake
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-20">
              <div className="max-w-sm mx-auto space-y-4">
                <div className="h-16 w-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto">
                  <Music className="h-8 w-8 text-gray-600" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2 text-white">No tracks in this playlist</h3>
                  <p className="text-sm text-gray-400">
                    This playlist is empty. Add some tracks to get started.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

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