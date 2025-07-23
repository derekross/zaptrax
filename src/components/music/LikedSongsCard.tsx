import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Play,
  Heart,
  MoreHorizontal,
  Calendar,
  Share2,
  Copy,
  MessageCircle,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthor } from '@/hooks/useAuthor';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { genUserName } from '@/lib/genUserName';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { wavlakeAPI } from '@/lib/wavlake';
import { useQueries } from '@tanstack/react-query';
import type { NostrEvent } from '@nostrify/nostrify';
import type { WavlakeTrack } from '@/lib/wavlake';
import { cn } from '@/lib/utils';
import { PlaylistTrackList } from './PlaylistTrackList';

interface LikedSongsCardProps {
  likedSongs: NostrEvent | null;
  pubkey: string;
  className?: string;
  onShare?: (playlist: NostrEvent) => void;
  onClone?: (playlist: NostrEvent) => void;
  onComment?: (playlist: NostrEvent) => void;
  showCloneButton?: boolean;
}

export function LikedSongsCard({
  likedSongs,
  pubkey,
  className,
  onShare,
  onClone,
  onComment,
  showCloneButton = false,
}: LikedSongsCardProps) {
  const { user } = useCurrentUser();
  const author = useAuthor(pubkey);
  const metadata = author.data?.metadata;
  const { playTrack } = useMusicPlayer();

  const _isOwner = user?.pubkey === pubkey;

  const getLikedSongsInfo = () => {
    if (!likedSongs) {
      return {
        title: 'Liked Songs',
        description: 'Favorite tracks',
        trackCount: 0,
      };
    }

    const titleTag = likedSongs.tags.find(tag => tag[0] === 'title');
    const descriptionTag = likedSongs.tags.find(tag => tag[0] === 'description');
    const trackTags = likedSongs.tags.filter(tag => tag[0] === 'r');

    return {
      title: titleTag?.[1] || 'Liked Songs',
      description: descriptionTag?.[1] || 'Favorite tracks',
      trackCount: trackTags.length,
    };
  };

  const { title, description, trackCount } = getLikedSongsInfo();
  const displayName = metadata?.name ?? genUserName(pubkey);
  const profileImage = metadata?.picture;

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const trackUrls = likedSongs?.tags.filter(tag => tag[0] === 'r').map(tag => tag[1]) || [];

  // Fetch track data for all liked songs
  const allLikedTracksData = useQueries({
    queries: trackUrls.map(url => {
      const trackId = url.substring(url.lastIndexOf('/') + 1);
      return {
        queryKey: ['wavlake-track', trackId],
        queryFn: () => wavlakeAPI.getTrack(trackId),
        enabled: !!trackId,
        staleTime: 30 * 60 * 1000,
      };
    }),
  });

  const allLikedTracks: WavlakeTrack[] = allLikedTracksData
    .filter(query => query.isSuccess && query.data)
    .map(query => (Array.isArray(query.data) ? query.data[0] : query.data));

  const allLikedTracksLoading = allLikedTracksData.some(query => query.isLoading);

  const handlePlayLikedSongs = () => {
    if (allLikedTracks.length > 0) {
      playTrack(allLikedTracks[0], allLikedTracks);
    }
  };

  return (
    <Card className={cn("group hover:shadow-md transition-shadow", className)}>
      <CardContent className="p-4">
        <div className="flex items-start space-x-4">
          {/* Liked Songs Cover */}
          <div className="relative flex-shrink-0">
            <div className="h-16 w-16 rounded-md bg-gradient-to-br from-pink-500 to-red-500 flex items-center justify-center">
              <Heart className="h-8 w-8 text-white fill-current" />
            </div>
            {trackCount > 0 && (
              <Button
                size="sm"
                variant="secondary"
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70 text-white border-0"
                onClick={handlePlayLikedSongs}
                disabled={allLikedTracksLoading || allLikedTracks.length === 0}
              >
                <Play className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Playlist Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate">
              {title}
            </h3>
            {description && (
              <p className="text-sm text-muted-foreground truncate mt-1">
                {description}
              </p>
            )}

            <div className="flex items-center space-x-2 mt-2">
              <Badge variant="outline" className="text-xs">
                {trackCount} {trackCount === 1 ? 'track' : 'tracks'}
              </Badge>
              {likedSongs && (
                <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(likedSongs.created_at)}</span>
                </div>
              )}
            </div>

            {trackUrls.length > 0 && (
              <PlaylistTrackList trackUrls={trackUrls} />
            )}

            {/* Author Info */}
            <div className="flex items-center space-x-2 mt-2">
              <Avatar className="h-4 w-4">
                <AvatarImage src={profileImage} alt={displayName} />
                <AvatarFallback className="text-xs">
                  {displayName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground truncate">
                by {displayName}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                side="bottom"
                sideOffset={4}
                alignOffset={-4}
                avoidCollisions={true}
                collisionPadding={16}
                className="min-w-[160px] max-w-[calc(100vw-32px)]"
              >
                {trackCount > 0 && (
                  <DropdownMenuItem
                    onClick={handlePlayLikedSongs}
                    disabled={allLikedTracksLoading || allLikedTracks.length === 0}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Play Playlist
                  </DropdownMenuItem>
                )}
                {user && likedSongs && (
                  <DropdownMenuItem onClick={() => onComment?.(likedSongs)}>
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Comment
                  </DropdownMenuItem>
                )}
                {likedSongs && (
                  <DropdownMenuItem onClick={() => onShare?.(likedSongs)}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share Playlist
                  </DropdownMenuItem>
                )}
                {showCloneButton && likedSongs && (
                  <DropdownMenuItem onClick={() => onClone?.(likedSongs)}>
                    <Copy className="h-4 w-4 mr-2" />
                    Clone Playlist
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}