import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useWavlakeAlbum } from '@/hooks/useWavlake';
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
import { Play, Pause, Heart, MoreHorizontal, Check, Share2, Copy, ExternalLink, ListPlus } from 'lucide-react';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { useCreatePlaylist, useUserPlaylists } from '@/hooks/useNostrMusic';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useToast } from '@/hooks/useToast';

export function AlbumPage() {
  const { albumId } = useParams<{ albumId: string }>();
  const { data: albumData, isLoading, error } = useWavlakeAlbum(albumId);
  const { state, playTrack, addToQueue, togglePlayPause } = useMusicPlayer();
  const { user } = useCurrentUser();
  const { mutate: createPlaylist } = useCreatePlaylist();
  const { data: userPlaylists } = useUserPlaylists();
  const { toast } = useToast();
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);

  // Handle case where API might return an array
  const album = Array.isArray(albumData) ? albumData[0] : albumData;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="relative h-[400px] overflow-hidden">
          <Skeleton className="w-full h-full" />
        </div>
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="space-y-4">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !album) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Album not found</h1>
          <p className="text-gray-400">The album you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const tracks = album.tracks || [];

  const handlePlayAlbum = () => {
    if (tracks.length > 0) {
      if (isAlbumPlaying()) {
        togglePlayPause();
      } else {
        playTrack(tracks[0], tracks);
      }
    }
  };

  const isAlbumPlaying = () => {
    if (!state.currentTrack) return false;
    return tracks.some(track => track.id === state.currentTrack?.id) && state.isPlaying;
  };

  // Check if album is already saved as a playlist
  const isAlbumSaved = () => {
    if (!album || !userPlaylists) return false;
    // Check for playlist with just the album title
    return userPlaylists.some(playlist => {
      const titleTag = playlist.tags.find(tag => tag[0] === 'title');
      return titleTag && titleTag[1] === album.albumTitle;
    });
  };

  const handleLikeAlbum = async () => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please login to save albums as playlists",
        variant: "destructive",
      });
      return;
    }

    if (!album || !tracks.length) {
      toast({
        title: "Error",
        description: "Unable to save album - no tracks found",
        variant: "destructive",
      });
      return;
    }

    if (isAlbumSaved()) {
      toast({
        title: "Album already saved",
        description: `"${album.albumTitle}" is already in your playlists`,
      });
      return;
    }

    setIsCreatingPlaylist(true);

    try {
      // Create track URLs for all tracks in the album
      const trackUrls = tracks.map(track => `https://wavlake.com/track/${track.id}`);

      // Create playlist with album name only for the title
      // Use album description if available, otherwise create a descriptive text
      const playlistName = album.albumTitle;
      const playlistDescription = album.description || `${album.albumTitle} by ${album.artist}`;

      createPlaylist({
        name: playlistName,
        description: playlistDescription,
        tracks: trackUrls,
      });

      toast({
        title: "Album saved!",
        description: `"${album.albumTitle}" has been added to your playlists`,
      });
    } catch (error) {
      console.error('Failed to create album playlist:', error);
      toast({
        title: "Error",
        description: "Failed to save album as playlist",
        variant: "destructive",
      });
    } finally {
      setIsCreatingPlaylist(false);
    }
  };

  // Handle menu actions
  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link copied",
      description: "Album link copied to clipboard",
    });
  };

  const handleShare = async () => {
    const url = window.location.href;
    const shareData = {
      title: `${album?.artist} - ${album?.albumTitle}`,
      text: `Check out this album on ZapTrax`,
      url: url,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback to copying link
        handleCopyLink();
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleAddToQueue = () => {
    if (tracks.length > 0) {
      tracks.forEach(track => addToQueue(track));
      toast({
        title: "Added to queue",
        description: `Added ${tracks.length} tracks to queue`,
      });
    }
  };

  const handleViewOnWavlake = () => {
    if (albumId) {
      window.open(`https://wavlake.com/album/${albumId}`, '_blank');
    }
  };

  // Calculate total duration
  const totalDuration = tracks.reduce((sum, track) => sum + (track.duration || 0), 0);
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours} hr ${minutes} min`;
    }
    return `${minutes} min`;
  };

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Hero Section with Album Art */}
      <div className="relative h-[400px] overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${album.albumArtUrl})`,
            filter: 'blur(20px) brightness(0.3)',
            transform: 'scale(1.1)'
          }}
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />

        {/* Album Info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center md:items-end gap-4 md:gap-6">
            {/* Album Cover */}
            <img
              src={album.albumArtUrl}
              alt={album.albumTitle}
              className="w-40 h-40 md:w-60 md:h-60 rounded-lg shadow-2xl flex-shrink-0"
            />

            {/* Album Details */}
            <div className="flex-1 text-center md:text-left md:pb-4">
              <p className="text-sm text-gray-300 mb-2">Album</p>
              <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-3 md:mb-4">{album.albumTitle}</h1>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-sm text-gray-300 mb-4 md:mb-6">
                <Link
                  to={`/artist/${album.artistId}`}
                  className="hover:text-white transition-colors font-medium"
                >
                  {album.artist}
                </Link>
                <span>•</span>
                <span>{new Date().getFullYear()}</span>
                <span>•</span>
                <span>{tracks.length} songs, {formatDuration(totalDuration)}</span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
                <Button
                  size="icon"
                  onClick={handlePlayAlbum}
                  className="h-14 w-14 rounded-full bg-white text-black hover:bg-gray-200 hover:scale-105 transition-all"
                >
                  {isAlbumPlaying() ? (
                    <Pause className="h-6 w-6 fill-black" />
                  ) : (
                    <Play className="h-6 w-6 fill-black" />
                  )}
                </Button>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="lg"
                        className={`p-2 md:p-3 rounded-full transition-colors hover:bg-purple-900/20 ${
                          isAlbumSaved()
                            ? 'text-purple-500 hover:text-purple-400'
                            : 'text-gray-400 hover:text-purple-400'
                        }`}
                        onClick={handleLikeAlbum}
                        disabled={isCreatingPlaylist}
                      >
                        {isCreatingPlaylist ? (
                          <div className="h-5 w-5 md:h-6 md:w-6 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : isAlbumSaved() ? (
                          <Check className="h-5 w-5 md:h-6 md:w-6" />
                        ) : (
                          <Heart className="h-5 w-5 md:h-6 md:w-6" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{isAlbumSaved() ? 'Album saved to playlists' : 'Save album as playlist'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

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
                    <DropdownMenuItem onClick={handleAddToQueue} className="hover:bg-purple-900/20 hover:text-purple-400">
                      <ListPlus className="h-4 w-4 mr-2" />
                      Add to Queue
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleShare} className="hover:bg-purple-900/20 hover:text-purple-400">
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleCopyLink} className="hover:bg-purple-900/20 hover:text-purple-400">
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Link
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-gray-800" />
                    <DropdownMenuItem onClick={handleViewOnWavlake} className="hover:bg-purple-900/20 hover:text-purple-400">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View on Wavlake
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Track List */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8">
        <div className="space-y-2">
          {tracks.map((track, index) => (
            <div
              key={track.id}
              className="flex items-center p-3 rounded-lg hover:bg-gray-900/50 transition-colors group cursor-pointer"
              onClick={() => playTrack(track, tracks)}
            >
              {/* Track Number / Play Button */}
              <div className="w-8 flex items-center justify-center mr-4">
                <span className="text-gray-400 group-hover:hidden text-sm">
                  {index + 1}
                </span>
                <Play className="h-4 w-4 text-white hidden group-hover:block" />
              </div>

              {/* Track Info */}
              <div className="flex-1 min-w-0">
                <div className="text-white font-medium truncate">
                  {track.title}
                </div>
                <div className="text-gray-400 text-sm truncate">
                  {track.artist}
                </div>
              </div>

              {/* Sats Earned */}
              <div className="text-gray-400 text-sm mr-4 hidden md:block">
                {track.msatTotal ? `${Math.floor(parseInt(track.msatTotal) / 1000)} sats` : '--'}
              </div>

              {/* Actions */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 mr-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-purple-400 hover:bg-purple-900/20 p-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Like track action
                  }}
                >
                  <Heart className="h-4 w-4" />
                </Button>
              </div>

              {/* Duration */}
              <div className="text-gray-400 text-sm w-12 text-right">
                {track.duration ? `${Math.floor(track.duration / 60)}:${(track.duration % 60).toString().padStart(2, '0')}` : '--:--'}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}