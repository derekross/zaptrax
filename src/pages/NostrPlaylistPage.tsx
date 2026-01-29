import { useParams, Link } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { nip19 } from 'nostr-tools';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Play, Pause, ListMusic, MoreHorizontal, Share2, Copy, Clock } from 'lucide-react';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { useNostrMusicPlaylist } from '@/hooks/useNostrMusicTracks';
import { useToast } from '@/hooks/useToast';
import { useAuthor } from '@/hooks/useAuthor';

export function NostrPlaylistPage() {
  const { naddr } = useParams<{ naddr: string }>();
  const { data, isLoading, error } = useNostrMusicPlaylist(naddr);
  const { state, playTrack, togglePlayPause } = useMusicPlayer();
  const { toast } = useToast();

  const playlist = data?.playlist;
  const tracks = data?.tracks || [];

  // Fetch author profile
  const authorPubkey = playlist?.event.pubkey;
  const author = useAuthor(authorPubkey);
  const authorName = author.data?.metadata?.name || author.data?.metadata?.display_name;

  // Dynamic meta tags
  useSeoMeta({
    title: playlist ? `${playlist.title} | ZapTrax` : 'ZapTrax - Nostr Playlist',
    description: playlist?.description || 'Stream music on ZapTrax',
    ogTitle: playlist?.title || 'ZapTrax',
    ogDescription: playlist?.description || 'Stream music on ZapTrax',
    ogImage: playlist?.image || `${window.location.origin}/zaptrax.png`,
    ogUrl: window.location.href,
    ogType: 'music.playlist',
    twitterCard: 'summary_large_image',
    twitterTitle: playlist?.title || 'ZapTrax',
    twitterDescription: playlist?.description || 'Stream music on ZapTrax',
    twitterImage: playlist?.image || `${window.location.origin}/zaptrax.png`,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="relative h-[520px] md:h-[400px] overflow-hidden">
          <Skeleton className="w-full h-full" />
        </div>
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
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
          <ListMusic className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4">Playlist not found</h1>
          <p className="text-gray-400">The playlist you're looking for doesn't exist or couldn't be loaded.</p>
        </div>
      </div>
    );
  }

  const handlePlayPlaylist = () => {
    if (tracks.length > 0) {
      const isCurrentTrack = tracks.some(t => t.id === state.currentTrack?.id);
      if (isCurrentTrack && state.isPlaying) {
        togglePlayPause();
      } else {
        playTrack(tracks[0], tracks);
      }
    }
  };

  const isPlaylistPlaying = () => {
    if (!state.currentTrack) return false;
    return tracks.some(track => track.id === state.currentTrack?.id) && state.isPlaying;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: "Link copied",
      description: "Playlist link copied to clipboard",
    });
  };

  const handleShare = async () => {
    const shareData = {
      title: playlist.title,
      text: playlist.description || `Check out this playlist on ZapTrax`,
      url: window.location.href,
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

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate total duration
  const totalDuration = tracks.reduce((sum, track) => sum + (track.duration || 0), 0);
  const formatTotalDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours} hr ${minutes} min`;
    }
    return `${minutes} min`;
  };

  // Generate npub for author link
  const authorNpub = authorPubkey ? nip19.npubEncode(authorPubkey) : null;

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Hero Section */}
      <div className="relative h-[520px] md:h-[400px] overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: playlist.image ? `url(${playlist.image})` : 'none',
            backgroundColor: playlist.image ? undefined : '#1a1a2e',
            filter: 'blur(20px) brightness(0.3)',
            transform: 'scale(1.1)'
          }}
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />

        {/* Playlist Info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center md:items-end gap-4 md:gap-6">
            {/* Playlist Cover */}
            {playlist.image ? (
              <img
                src={playlist.image}
                alt={playlist.title}
                className="w-40 h-40 md:w-60 md:h-60 rounded-lg shadow-2xl flex-shrink-0 object-cover"
              />
            ) : (
              <div className="w-40 h-40 md:w-60 md:h-60 rounded-lg shadow-2xl flex-shrink-0 bg-gradient-to-br from-purple-600 to-purple-900 flex items-center justify-center">
                <ListMusic className="h-20 w-20 text-white/60" />
              </div>
            )}

            {/* Playlist Details */}
            <div className="flex-1 text-center md:text-left md:pb-4">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                <span className="bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                  Nostr Playlist
                </span>
              </div>
              <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-3 md:mb-4">{playlist.title}</h1>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-sm text-gray-300 mb-4 md:mb-6">
                {authorNpub && (
                  <Link
                    to={`/profile/${authorNpub}`}
                    className="hover:text-white transition-colors font-medium"
                  >
                    {authorName || 'Unknown'}
                  </Link>
                )}
                <span>-</span>
                <span>{tracks.length} songs</span>
                {totalDuration > 0 && (
                  <>
                    <span>-</span>
                    <span>{formatTotalDuration(totalDuration)}</span>
                  </>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
                <Button
                  size="icon"
                  onClick={handlePlayPlaylist}
                  disabled={tracks.length === 0}
                  className="h-14 w-14 rounded-full bg-white text-black hover:bg-gray-200 hover:scale-105 transition-all disabled:opacity-50"
                >
                  {isPlaylistPlaying() ? (
                    <Pause className="h-6 w-6 fill-black" />
                  ) : (
                    <Play className="h-6 w-6 fill-black" />
                  )}
                </Button>

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
                    <DropdownMenuItem onClick={handleShare} className="hover:bg-purple-900/20 hover:text-purple-400">
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleCopyLink} className="hover:bg-purple-900/20 hover:text-purple-400">
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Link
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      {playlist.description && (
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
          <p className="text-gray-400">{playlist.description}</p>
        </div>
      )}

      {/* Track List */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8">
        {tracks.length === 0 ? (
          <div className="text-center py-12">
            <ListMusic className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">This playlist is empty or tracks couldn't be loaded.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tracks.map((track, index) => {
              const isCurrentTrack = state.currentTrack?.id === track.id;
              const isPlaying = isCurrentTrack && state.isPlaying;

              // Generate naddr for track link
              const trackNaddr = track.nostrPubkey && track.nostrDTag
                ? nip19.naddrEncode({
                    kind: 36787,
                    pubkey: track.nostrPubkey,
                    identifier: track.nostrDTag,
                  })
                : null;

              return (
                <div
                  key={track.id}
                  className={`flex items-center p-3 rounded-lg hover:bg-gray-900/50 transition-colors group cursor-pointer ${
                    isCurrentTrack ? 'bg-gray-900/70' : ''
                  }`}
                  onClick={() => playTrack(track, tracks)}
                >
                  {/* Track Number / Play Button */}
                  <div className="w-8 flex items-center justify-center mr-4">
                    {isPlaying ? (
                      <div className="w-4 h-4 flex items-center justify-center">
                        <div className="flex gap-0.5">
                          <div className="w-1 h-3 bg-purple-500 animate-pulse" />
                          <div className="w-1 h-3 bg-purple-500 animate-pulse delay-75" />
                          <div className="w-1 h-3 bg-purple-500 animate-pulse delay-150" />
                        </div>
                      </div>
                    ) : (
                      <>
                        <span className="text-gray-400 group-hover:hidden text-sm">
                          {index + 1}
                        </span>
                        <Play className="h-4 w-4 text-white hidden group-hover:block" />
                      </>
                    )}
                  </div>

                  {/* Track Art */}
                  <div className="w-10 h-10 rounded overflow-hidden mr-3 flex-shrink-0">
                    {track.albumArtUrl ? (
                      <img
                        src={track.albumArtUrl}
                        alt={track.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                        <ListMusic className="h-4 w-4 text-gray-600" />
                      </div>
                    )}
                  </div>

                  {/* Track Info */}
                  <div className="flex-1 min-w-0">
                    {trackNaddr ? (
                      <Link
                        to={`/track/${trackNaddr}`}
                        className="text-white font-medium truncate block hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {track.title}
                      </Link>
                    ) : (
                      <div className="text-white font-medium truncate">
                        {track.title}
                      </div>
                    )}
                    {track.nostrPubkey ? (
                      <Link
                        to={`/profile/${nip19.npubEncode(track.nostrPubkey)}`}
                        className="text-gray-400 text-sm truncate block hover:text-purple-400 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {track.artist}
                      </Link>
                    ) : (
                      <div className="text-gray-400 text-sm truncate">
                        {track.artist}
                      </div>
                    )}
                  </div>

                  {/* Duration */}
                  <div className="text-gray-400 text-sm w-12 text-right flex items-center justify-end gap-1">
                    <Clock className="h-3 w-3" />
                    {track.duration ? formatDuration(track.duration) : '--:--'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
