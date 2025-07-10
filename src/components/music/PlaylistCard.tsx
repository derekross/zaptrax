import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Play,
  Music,
  MoreHorizontal,
  Calendar,
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
import { useAuthor } from '@/hooks/useAuthor';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { genUserName } from '@/lib/genUserName';
import type { NostrEvent } from '@nostrify/nostrify';
import { cn } from '@/lib/utils';
import { PlaylistTrackList } from './PlaylistTrackList';

interface PlaylistCardProps {
  playlist: NostrEvent;
  className?: string;
  onPlay?: (playlist: NostrEvent) => void;
  onEdit?: (playlist: NostrEvent) => void;
  onDelete?: (playlist: NostrEvent) => void;
  onShare?: (playlist: NostrEvent) => void;
}

export function PlaylistCard({
  playlist,
  className,
  onPlay,
  onEdit,
  onDelete,
  onShare,
}: PlaylistCardProps) {
  const { user } = useCurrentUser();
  const author = useAuthor(playlist.pubkey);
  const metadata = author.data?.metadata;

  const isOwner = user?.pubkey === playlist.pubkey;

  const getPlaylistInfo = () => {
    const titleTag = playlist.tags.find(tag => tag[0] === 'title');
    const descriptionTag = playlist.tags.find(tag => tag[0] === 'description');
    const trackTags = playlist.tags.filter(tag => tag[0] === 'r');

    return {
      title: titleTag?.[1] || 'Untitled Playlist',
      description: descriptionTag?.[1] || '',
      trackCount: trackTags.length,
    };
  };

  const { title, description, trackCount } = getPlaylistInfo();
  const displayName = metadata?.name ?? genUserName(playlist.pubkey);
  const profileImage = metadata?.picture;

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
    <Card className={cn("group hover:shadow-md transition-shadow", className)}>
      <CardContent className="p-4">
        <div className="flex items-start space-x-4">
          {/* Playlist Cover */}
          <div className="relative flex-shrink-0">
            <div className={cn(
              "h-16 w-16 rounded-md flex items-center justify-center",
              getPlaylistImage()
            )}>
              <Music className="h-8 w-8 text-white" />
            </div>
            <Button
              size="sm"
              variant="secondary"
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70 text-white border-0"
              onClick={() => onPlay?.(playlist)}
            >
              <Play className="h-4 w-4" />
            </Button>
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
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(playlist.created_at)}</span>
              </div>
            </div>

            <PlaylistTrackList trackUrls={playlist.tags.filter(tag => tag[0] === 'r').map(tag => tag[1])} />

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
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onPlay?.(playlist)}>
                  <Play className="h-4 w-4 mr-2" />
                  Play Playlist
                </DropdownMenuItem>
                {isOwner && (
                  <DropdownMenuItem onClick={() => onEdit?.(playlist)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Playlist
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => onShare?.(playlist)}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Playlist
                </DropdownMenuItem>
                {isOwner && (
                  <DropdownMenuItem
                    onClick={() => onDelete?.(playlist)}
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
      </CardContent>
    </Card>
  );
}