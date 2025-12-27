import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Play, Radio, ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { usePodcastIndexFeedEpisodes, usePodcastIndexFeed } from '@/hooks/usePodcastIndex';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { podcastIndexEpisodeToUnified } from '@/lib/unifiedTrack';
import { cn } from '@/lib/utils';

export function PodcastIndexFeedPage() {
  const { feedId } = useParams<{ feedId: string }>();
  const navigate = useNavigate();
  const { playTrack } = useMusicPlayer();

  const parsedFeedId = feedId ? parseInt(feedId) : undefined;
  const { data: feedData, isLoading: episodesLoading, error: episodesError } = usePodcastIndexFeedEpisodes(parsedFeedId);
  const { data: feedInfo, isLoading: feedLoading } = usePodcastIndexFeed(parsedFeedId);

  const isLoading = episodesLoading || feedLoading;
  const error = episodesError;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white pb-20">
        {/* Header Skeleton */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-b from-purple-900/50 to-black" />
          <div className="relative px-6 pt-20 pb-8">
            <Button
              variant="ghost"
              size="sm"
              className="mb-4 text-gray-400 hover:text-white"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <Skeleton className="w-64 h-64 rounded-lg bg-gray-800" />
              <div className="flex-1 space-y-4">
                <Skeleton className="h-8 w-3/4 bg-gray-800" />
                <Skeleton className="h-6 w-1/2 bg-gray-800" />
                <Skeleton className="h-4 w-full bg-gray-800" />
              </div>
            </div>
          </div>
        </div>

        {/* Episodes Skeleton */}
        <div className="px-6 py-8">
          <Skeleton className="h-8 w-32 mb-4 bg-gray-800" />
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full bg-gray-800" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !feedData) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Failed to load feed</h2>
          <p className="text-gray-400 mb-4">{error?.message || 'Feed not found'}</p>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </div>
    );
  }

  const feed = feedData.items[0]; // Get feed info from first episode
  const episodes = feedData.items;
  const unifiedTracks = episodes.map(ep => podcastIndexEpisodeToUnified(ep, feedInfo?.feed));

  const handlePlayAll = () => {
    if (unifiedTracks.length > 0) {
      playTrack(unifiedTracks[0], unifiedTracks);
    }
  };

  const handleTrackPlay = (index: number) => {
    playTrack(unifiedTracks[index], unifiedTracks);
  };

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Hero Section with Background Image - matching ArtistPage style */}
      <div className="relative overflow-hidden h-[580px] md:h-[500px]" style={{ marginTop: 'calc(-4rem - env(safe-area-inset-top, 0px))', paddingTop: 'calc(4rem + env(safe-area-inset-top, 0px))' }}>
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${feed.feedImage})`,
            filter: 'blur(20px) brightness(0.4)',
            transform: 'scale(1.1)'
          }}
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />

        {/* Artist Info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            <Button
              variant="ghost"
              size="sm"
              className="mb-4 text-gray-400 hover:text-white hover:bg-gray-800/50"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center gap-2 text-sm text-purple-400 mb-2">
              <Radio className="h-4 w-4" />
              <span>Podcasting 2.0 Music</span>
            </div>
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-2 md:mb-4">
              {feedInfo?.feed?.author || feed.feedTitle}
            </h1>
            <p className="text-sm md:text-lg text-gray-300 mb-4 md:mb-6 max-w-2xl line-clamp-2 md:line-clamp-none">
              {feedInfo?.feed?.description || ''}
            </p>
            <div className="flex gap-4">
              <Button
                size="lg"
                className="bg-purple-600 hover:bg-purple-700 text-white rounded-full px-8"
                onClick={handlePlayAll}
              >
                <Play className="h-5 w-5 mr-2 fill-current" />
                Play All
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Episodes List */}
      <div className="px-6 py-8">
        <h2 className="text-2xl font-bold mb-6">Episodes</h2>

        <div className="space-y-2">
          {episodes.map((episode, index) => {
            const unifiedTrack = unifiedTracks[index];
            const duration = episode.duration;
            const minutes = Math.floor(duration / 60);
            const seconds = duration % 60;

            return (
              <Card
                key={episode.id}
                className="bg-gray-900 border-gray-800 hover:bg-gray-800 transition-colors cursor-pointer group"
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Play Button */}
                    <div className="flex-shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-10 w-10 rounded-full bg-gray-800 group-hover:bg-purple-600 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTrackPlay(index);
                        }}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Episode Image */}
                    {episode.image && (
                      <div className="flex-shrink-0">
                        <img
                          src={episode.image}
                          alt={episode.title}
                          className="w-12 h-12 rounded object-cover"
                        />
                      </div>
                    )}

                    {/* Episode Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-white truncate">
                        {episode.title}
                      </h3>
                      <p className="text-sm text-gray-400 line-clamp-1">
                        {episode.description || 'No description'}
                      </p>
                      {episode.datePublishedPretty && (
                        <p className="text-xs text-gray-500 mt-1">
                          {episode.datePublishedPretty}
                        </p>
                      )}
                    </div>

                    {/* Duration */}
                    <div className="flex-shrink-0 text-sm text-gray-400">
                      {minutes}:{seconds.toString().padStart(2, '0')}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
