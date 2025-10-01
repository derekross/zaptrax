import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Play, Radio, ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { usePodcastIndexFeedEpisodes } from '@/hooks/usePodcastIndex';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { podcastIndexEpisodeToUnified } from '@/lib/unifiedTrack';
import { cn } from '@/lib/utils';

export function PodcastIndexFeedPage() {
  const { feedId } = useParams<{ feedId: string }>();
  const navigate = useNavigate();
  const { playTrack } = useMusicPlayer();

  const { data: feedData, isLoading, error } = usePodcastIndexFeedEpisodes(
    feedId ? parseInt(feedId) : undefined
  );

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
  const unifiedTracks = episodes.map(ep => podcastIndexEpisodeToUnified(ep));

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
      {/* Hero Section with Feed Info */}
      <div className="relative">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/50 to-black" />

        {/* Content */}
        <div className="relative px-6 pt-20 pb-8">
          <Button
            variant="ghost"
            size="sm"
            className="mb-4 text-gray-400 hover:text-white hover:bg-gray-800"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Feed Image */}
            <div className="flex-shrink-0">
              <img
                src={feed.feedImage}
                alt={feed.feedTitle}
                className="w-64 h-64 rounded-lg shadow-2xl object-cover"
              />
            </div>

            {/* Feed Info */}
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-2 text-sm text-purple-400">
                <Radio className="h-4 w-4" />
                <span>Podcasting 2.0 Music</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-bold">{feed.feedTitle}</h1>
              {feed.feedTitle !== episodes[0]?.feedTitle && (
                <p className="text-xl text-gray-300">{episodes[0]?.feedTitle}</p>
              )}
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span>{episodes.length} episodes</span>
              </div>
              {feed.description && (
                <p className="text-gray-400 line-clamp-3">{feed.description}</p>
              )}
              <div className="flex gap-4 pt-4">
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
