import React from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Heart, Play, Pause, Clock } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useLikedSongs } from '@/hooks/useNostrMusic';
import { LikedTrackItem } from './LikedTrackItem';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import type { UnifiedTrack } from '@/lib/unifiedTrack';
import { useQueries } from '@tanstack/react-query';
import { wavlakeAPI } from '@/lib/wavlake';
import { wavlakeToUnified } from '@/lib/unifiedTrack';

export function MusicLikedSongs() {
  const { user } = useCurrentUser();
  const { data: likedSongs, isLoading: likedSongsLoading } = useLikedSongs();
  const { state, playTrack, togglePlayPause } = useMusicPlayer();

  const getLikedSongsUrls = () => {
    if (!likedSongs) return [];
    return likedSongs.tags.filter(tag => tag[0] === 'r').map(tag => tag[1]);
  };

  const trackUrls = getLikedSongsUrls();

  // Fetch tracks - use metadata tags if available, otherwise fetch from API
  const trackQueries = useQueries({
    queries: trackUrls.map(url => {
      const titleTag = likedSongs?.tags.find(tag => tag[0] === 'track-title' && tag[1] === url);
      const hasMetadata = !!titleTag;

      return {
        queryKey: ['liked-track', url],
        queryFn: async (): Promise<UnifiedTrack> => {
          // If we have metadata tags, use them
          if (hasMetadata) {
            const artistTag = likedSongs?.tags.find(tag => tag[0] === 'track-artist' && tag[1] === url);
            const imageTag = likedSongs?.tags.find(tag => tag[0] === 'track-image' && tag[1] === url);
            const sourceTag = likedSongs?.tags.find(tag => tag[0] === 'track-source' && tag[1] === url);
            const feedIdTag = likedSongs?.tags.find(tag => tag[0] === 'track-feed-id' && tag[1] === url);

            const source = (sourceTag?.[2] || 'wavlake') as 'wavlake' | 'podcastindex';
            const feedId = feedIdTag?.[2] ? parseInt(feedIdTag[2]) : undefined;

            return {
              id: url,
              sourceId: url,
              source,
              title: titleTag?.[2] || 'Unknown Title',
              artist: artistTag?.[2] || 'Unknown Artist',
              albumTitle: '',
              albumArtUrl: imageTag?.[2] || '',
              artistArtUrl: '',
              mediaUrl: url,
              duration: 0,
              releaseDate: new Date().toISOString(),
              feedId,
            };
          }

          // No metadata - must be an old Wavlake track, fetch from API
          const isWavlake = url.includes('/album/') || url.includes('wavlake.com/track/') || url.includes('/track/');
          if (isWavlake) {
            // Extract track ID from URL (works for /album/, /track/, and wavlake.com/track/ formats)
            const trackId = url.substring(url.lastIndexOf('/') + 1);
            const trackData = await wavlakeAPI.getTrack(trackId);
            const wavlakeTrack = Array.isArray(trackData) ? trackData[0] : trackData;
            return wavlakeToUnified(wavlakeTrack);
          }

          // Unknown format
          throw new Error(`Cannot load track: ${url}`);
        },
        enabled: !!url,
        staleTime: 30 * 60 * 1000,
        retry: 1,
      };
    }),
  });

  const likedTracks: UnifiedTrack[] = trackQueries
    .filter(query => query.isSuccess && query.data)
    .map(query => query.data as UnifiedTrack);

  const isLoadingTracks = trackQueries.some(query => query.isLoading);

  const handleTrackClick = (track: UnifiedTrack) => {
    if (likedTracks) {
      playTrack(track, likedTracks);
    }
  };

  const isLikedSongsPlaying = () => {
    if (!state.currentTrack || likedTracks.length === 0) return false;
    return likedTracks.some(track => track.id === state.currentTrack?.id) && state.isPlaying;
  };

  const handlePlayAll = () => {
    if (likedTracks.length > 0) {
      if (isLikedSongsPlaying()) {
        togglePlayPause();
      } else {
        playTrack(likedTracks[0], likedTracks);
      }
    }
  };

  const formatDuration = (tracks: UnifiedTrack[]) => {
    const totalSeconds = tracks.reduce((acc, track) => acc + (track.duration || 0), 0);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="text-center py-20">
          <h3 className="font-medium mb-2 text-white">Log in to see your liked songs</h3>
          <p className="text-sm text-gray-400 mb-4">
            You need to be logged in to like and view your favorite songs.
          </p>
        </div>
      </div>
    );
  }

  const trackCount = likedTracks.length;

  return (
    <div className="min-h-screen bg-black text-white pb-32">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-6 p-4 md:p-6 pb-6 md:pb-8">
        {/* Liked Music Icon */}
        <div className="flex-shrink-0">
          <div className="h-40 w-40 md:h-64 md:w-64 rounded-lg bg-gradient-to-br from-purple-600 via-purple-700 to-purple-900 flex items-center justify-center shadow-2xl">
            <Heart className="h-16 w-16 md:h-24 md:w-24 text-white fill-current" />
          </div>
        </div>

        {/* Playlist Info */}
        <div className="flex-1 space-y-4 md:space-y-6 text-center md:text-left md:pt-16">
          <div>
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-3 md:mb-6 text-white">Liked Music</h1>
            <div className="mt-2 text-gray-300">
              <span>{trackCount} songs • {likedTracks.length > 0 ? formatDuration(likedTracks) : '0m'}</span>
            </div>
            <p className="text-sm text-gray-400 mt-4 max-w-lg">
              Only the music you like in ZapTrax will show here. If you want liked music from other sources, you can import it.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
            <Button
              size="icon"
              onClick={handlePlayAll}
              disabled={likedSongsLoading || isLoadingTracks || likedTracks.length === 0}
              className="h-14 w-14 rounded-full bg-white text-black hover:bg-gray-200 hover:scale-105 transition-all"
            >
              {isLikedSongsPlaying() ? (
                <Pause className="h-6 w-6 fill-black" />
              ) : (
                <Play className="h-6 w-6 fill-black" />
              )}
            </Button>

          </div>
        </div>
      </div>

      {/* Track List */}
      <div className="px-4 md:px-6">
        {likedSongsLoading || isLoadingTracks ? (
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-2">
                <Skeleton className="h-4 w-6 bg-gray-800" />
                <Skeleton className="h-12 w-12 rounded-md bg-gray-800" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48 bg-gray-800" />
                  <Skeleton className="h-3 w-32 bg-gray-800" />
                </div>
                <Skeleton className="h-4 w-12 bg-gray-800" />
                <Skeleton className="h-8 w-8 bg-gray-800" />
              </div>
            ))}
          </div>
        ) : likedTracks.length > 0 ? (
          <div className="space-y-1">
            {/* Header Row */}
            <div className="grid grid-cols-10 gap-4 px-4 py-2 text-sm text-gray-400 border-b border-gray-800 mb-4">
              <div className="col-span-1 text-center">#</div>
              <div className="col-span-6">Title</div>
              <div className="col-span-2">Album</div>
              <div className="col-span-1 text-center">
                <Clock className="h-4 w-4 mx-auto" />
              </div>
            </div>

            {/* Track List */}
            {likedTracks.map((track, index) => (
              <LikedTrackItem
                key={track.id}
                track={track}
                index={index + 1}
                onClick={handleTrackClick}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="max-w-sm mx-auto space-y-4">
              <div className="h-16 w-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto">
                <Heart className="h-8 w-8 text-gray-600" />
              </div>
              <div>
                <h3 className="font-semibold mb-2 text-white">No liked songs yet</h3>
                <p className="text-sm text-gray-400">
                  Songs you like will appear here. Start exploring and find your favorites!
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}