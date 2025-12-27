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
import { Play, Pause, Heart, MoreHorizontal, Share2, Copy, Disc3, Clock, Calendar, Music2 } from 'lucide-react';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { useNostrMusicTrack, useNostrMusicTracks } from '@/hooks/useNostrMusicTracks';
import { nostrTrackToUnified } from '@/lib/unifiedTrack';
import { useToast } from '@/hooks/useToast';
import { useAuthor } from '@/hooks/useAuthor';

export function NostrTrackPage() {
  const { naddr } = useParams<{ naddr: string }>();
  const { data: track, isLoading, error } = useNostrMusicTrack(naddr);
  const { data: allTracks } = useNostrMusicTracks(50);
  const { state, playTrack, togglePlayPause } = useMusicPlayer();
  const { toast } = useToast();

  // Fetch author profile
  const authorPubkey = track?.event.pubkey;
  const author = useAuthor(authorPubkey);
  const authorName = author.data?.metadata?.name || author.data?.metadata?.display_name;

  // Dynamic meta tags for social media
  useSeoMeta({
    title: track ? `${track.title} - ${track.artist} | ZapTrax` : 'ZapTrax - Nostr Music',
    description: track ? `Listen to "${track.title}" by ${track.artist} on ZapTrax. Native Nostr music streaming.` : 'Stream music on ZapTrax',
    ogTitle: track ? `${track.title} - ${track.artist}` : 'ZapTrax',
    ogDescription: track ? `Listen to "${track.title}" by ${track.artist} on ZapTrax` : 'Stream music on ZapTrax',
    ogImage: track?.image || `${window.location.origin}/zaptrax.png`,
    ogUrl: window.location.href,
    ogType: 'music.song',
    twitterCard: 'summary_large_image',
    twitterTitle: track ? `${track.title} - ${track.artist}` : 'ZapTrax',
    twitterDescription: track ? `Listen to "${track.title}" by ${track.artist} on ZapTrax` : 'Stream music on ZapTrax',
    twitterImage: track?.image || `${window.location.origin}/zaptrax.png`,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="relative overflow-hidden h-[520px] md:h-[400px]">
          <Skeleton className="w-full h-full" />
        </div>
        <div className="max-w-7xl mx-auto px-8 py-8">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-6 w-48 mb-8" />
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !track) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <Disc3 className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4">Track not found</h1>
          <p className="text-gray-400">The track you're looking for doesn't exist or couldn't be loaded.</p>
        </div>
      </div>
    );
  }

  const unifiedTrack = nostrTrackToUnified(track);

  const handlePlayTrack = () => {
    const isCurrentTrack = state.currentTrack?.id === unifiedTrack.id;

    if (isCurrentTrack) {
      togglePlayPause();
    } else {
      // Use all nostr tracks as queue if available
      const queue = allTracks ? allTracks.map(nostrTrackToUnified) : [unifiedTrack];
      playTrack(unifiedTrack, queue);
    }
  };

  const isPlaying = state.currentTrack?.id === unifiedTrack.id && state.isPlaying;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: "Link copied",
      description: "Track link copied to clipboard",
    });
  };

  const handleShare = async () => {
    const shareData = {
      title: `${track.title} - ${track.artist}`,
      text: `Listen to "${track.title}" by ${track.artist} on ZapTrax`,
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

  // Generate npub for author link
  const authorNpub = authorPubkey ? nip19.npubEncode(authorPubkey) : null;

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Hero Section with Track Art */}
      <div className="relative overflow-hidden h-[520px] md:h-[400px]">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: track.image ? `url(${track.image})` : 'none',
            backgroundColor: track.image ? undefined : '#1a1a2e',
            filter: 'blur(20px) brightness(0.3)',
            transform: 'scale(1.1)'
          }}
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />

        {/* Track Info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center md:items-end gap-4 md:gap-6">
            {/* Track Cover */}
            {track.image ? (
              <img
                src={track.image}
                alt={track.title}
                className="w-40 h-40 md:w-60 md:h-60 rounded-lg shadow-2xl flex-shrink-0 object-cover"
              />
            ) : (
              <div className="w-40 h-40 md:w-60 md:h-60 rounded-lg shadow-2xl flex-shrink-0 bg-gradient-to-br from-purple-600 to-purple-900 flex items-center justify-center">
                <Disc3 className="h-20 w-20 text-white/60" />
              </div>
            )}

            {/* Track Details */}
            <div className="flex-1 text-center md:text-left md:pb-4">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                <span className="bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                  Nostr Music
                </span>
                {track.explicit && (
                  <span className="bg-gray-600 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                    Explicit
                  </span>
                )}
              </div>
              <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-3 md:mb-4">{track.title}</h1>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-sm text-gray-300 mb-4 md:mb-6">
                {authorNpub ? (
                  <Link
                    to={`/profile/${authorNpub}`}
                    className="font-medium hover:text-purple-400 transition-colors"
                  >
                    {track.artist}
                  </Link>
                ) : (
                  <span className="font-medium">{track.artist}</span>
                )}
                {track.album && (
                  <>
                    <span>-</span>
                    <span>{track.album}</span>
                  </>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
                <Button
                  size="icon"
                  onClick={handlePlayTrack}
                  className="h-14 w-14 rounded-full bg-white text-black hover:bg-gray-200 hover:scale-105 transition-all"
                >
                  {isPlaying ? (
                    <Pause className="h-6 w-6 fill-black" />
                  ) : (
                    <Play className="h-6 w-6 fill-black" />
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="lg"
                  className="text-gray-400 hover:text-purple-400 hover:bg-purple-900/20 p-3 rounded-full"
                >
                  <Heart className="h-6 w-6" />
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

      {/* Track Details Section */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8">
        {/* Track Metadata */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {track.duration && (
            <div className="bg-gray-900 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-400 mb-1">
                <Clock className="h-4 w-4" />
                <span className="text-sm">Duration</span>
              </div>
              <p className="text-white font-medium">{formatDuration(track.duration)}</p>
            </div>
          )}

          {track.released && (
            <div className="bg-gray-900 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-400 mb-1">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">Released</span>
              </div>
              <p className="text-white font-medium">{track.released}</p>
            </div>
          )}

          {track.genres.length > 0 && (
            <div className="bg-gray-900 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-400 mb-1">
                <Music2 className="h-4 w-4" />
                <span className="text-sm">Genre</span>
              </div>
              <p className="text-white font-medium capitalize">{track.genres.join(', ')}</p>
            </div>
          )}

          {track.format && (
            <div className="bg-gray-900 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-400 mb-1">
                <Disc3 className="h-4 w-4" />
                <span className="text-sm">Format</span>
              </div>
              <p className="text-white font-medium uppercase">{track.format}</p>
            </div>
          )}
        </div>

        {/* Author/Publisher Info */}
        {authorNpub && (
          <div className="bg-gray-900 rounded-lg p-4 mb-8">
            <h3 className="text-sm text-gray-400 mb-3">Published by</h3>
            <Link
              to={`/profile/${authorNpub}`}
              className="flex items-center gap-3 hover:bg-gray-800 p-2 -m-2 rounded-lg transition-colors"
            >
              {author.data?.metadata?.picture ? (
                <img
                  src={author.data.metadata.picture}
                  alt={authorName || 'Author'}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center">
                  <span className="text-white font-medium">
                    {(authorName || 'A').charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <p className="text-white font-medium">{authorName || 'Unknown'}</p>
                <p className="text-gray-400 text-sm truncate max-w-[200px]">
                  {authorNpub.slice(0, 16)}...
                </p>
              </div>
            </Link>
          </div>
        )}

        {/* Lyrics/Credits Section */}
        {track.content && (
          <div className="bg-gray-900 rounded-lg p-6">
            <h3 className="text-lg font-bold text-white mb-4">Lyrics & Credits</h3>
            <div className="text-gray-300 whitespace-pre-wrap">
              {track.content}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
