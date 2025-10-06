import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Plus,
  Music,
  Check,
  Calendar,
} from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useUserPlaylists } from '@/hooks/useNostrMusic';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useToast } from '@/hooks/useToast';
import { CreatePlaylistDialog } from './CreatePlaylistDialog';
import type { WavlakeTrack } from '@/lib/wavlake';
import type { UnifiedTrack } from '@/lib/unifiedTrack';
import { wavlakeToUnified } from '@/lib/unifiedTrack';
import type { NostrEvent } from '@nostrify/nostrify';

interface AddToPlaylistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  track: UnifiedTrack | WavlakeTrack | null;
}

export function AddToPlaylistDialog({
  open,
  onOpenChange,
  track,
}: AddToPlaylistDialogProps) {
  const { user } = useCurrentUser();
  const { data: userPlaylists, isLoading: playlistsLoading } = useUserPlaylists();
  const { mutate: createEvent } = useNostrPublish();
  const { toast } = useToast();

  const [createPlaylistOpen, setCreatePlaylistOpen] = useState(false);
  const [addingToPlaylist, setAddingToPlaylist] = useState<string | null>(null);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const getPlaylistInfo = (playlist: NostrEvent) => {
    const titleTag = playlist.tags.find(tag => tag[0] === 'title');
    const trackTags = playlist.tags.filter(tag => tag[0] === 'r');

    return {
      title: titleTag?.[1] || 'Untitled Playlist',
      trackCount: trackTags.length,
    };
  };

  const isTrackInPlaylist = (playlist: NostrEvent, trackUrl: string) => {
    return playlist.tags.some(tag => tag[0] === 'r' && tag[1] === trackUrl);
  };

  const handleAddToExistingPlaylist = async (playlist: NostrEvent) => {
    if (!track || !user) return;

    // Convert to UnifiedTrack format
    const unifiedTrack: UnifiedTrack = 'source' in track ? track : wavlakeToUnified(track);

    // Generate trackUrl based on source
    let trackUrl = '';
    if (unifiedTrack.source === 'wavlake') {
      trackUrl = `https://wavlake.com/track/${unifiedTrack.sourceId}`;
    } else if (unifiedTrack.source === 'podcastindex') {
      trackUrl = unifiedTrack.mediaUrl;
    }

    // Check if track is already in playlist
    if (isTrackInPlaylist(playlist, trackUrl)) {
      toast({
        title: "Track already in playlist",
        description: "This track is already in the selected playlist.",
        variant: "destructive",
      });
      return;
    }

    setAddingToPlaylist(playlist.id);

    try {
      // Get existing playlist data
      const titleTag = playlist.tags.find(tag => tag[0] === 'title');
      const descriptionTag = playlist.tags.find(tag => tag[0] === 'description');
      const dTag = playlist.tags.find(tag => tag[0] === 'd');

      // Get existing track-related tags
      const existingTrackMetadata = playlist.tags.filter(tag =>
        ['r', 'track-title', 'track-artist', 'track-image', 'track-source', 'track-feed-id'].includes(tag[0])
      );

      // Create new track tags with metadata
      const newTrackTags: string[][] = [
        ['r', trackUrl],
        ['track-title', trackUrl, unifiedTrack.title || ''],
        ['track-artist', trackUrl, unifiedTrack.artist || ''],
        ['track-image', trackUrl, unifiedTrack.albumArtUrl || ''],
        ['track-source', trackUrl, unifiedTrack.source || 'wavlake'],
      ];

      // Add feed ID for PodcastIndex tracks
      if (unifiedTrack.source === 'podcastindex' && unifiedTrack.feedId) {
        newTrackTags.push(['track-feed-id', trackUrl, String(unifiedTrack.feedId)]);
      }

      // Create new playlist event with the additional track
      const tags = [
        ['d', dTag?.[1] || ''],
        ['title', titleTag?.[1] || 'Untitled Playlist'],
        ['t', 'music'],
        ...(descriptionTag ? [['description', descriptionTag[1]]] : []),
        ...existingTrackMetadata,
        ...newTrackTags,
      ];

      createEvent({
        kind: 30003,
        content: '',
        tags,
      });

      toast({
        title: "Track added to playlist",
        description: `"${unifiedTrack.title}" has been added to "${titleTag?.[1] || 'Untitled Playlist'}".`,
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Failed to add track to playlist:', error);
      toast({
        title: "Failed to add track",
        description: "There was an error adding the track to the playlist.",
        variant: "destructive",
      });
    } finally {
      setAddingToPlaylist(null);
    }
  };

  const handleCreateNewPlaylist = () => {
    setCreatePlaylistOpen(true);
    onOpenChange(false);
  };

  if (!user) {
    return null;
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add to Playlist</DialogTitle>
          </DialogHeader>

          {track && (
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg mb-4">
              <Avatar className="h-12 w-12 rounded-md">
                <AvatarImage src={track.albumArtUrl} alt={track.albumTitle} />
                <AvatarFallback className="rounded-md">
                  <Music className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{track.title}</p>
                <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {/* Create New Playlist Button */}
            <Button
              onClick={handleCreateNewPlaylist}
              className="w-full justify-start h-auto p-4"
              variant="outline"
            >
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-md bg-primary flex items-center justify-center">
                  <Plus className="h-6 w-6 text-primary-foreground" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Create New Playlist</p>
                  <p className="text-xs text-muted-foreground">Start a new playlist with this track</p>
                </div>
              </div>
            </Button>

            {/* Existing Playlists */}
            {playlistsLoading ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Your Playlists</p>
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
                      <Skeleton className="h-12 w-12 rounded-md" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : userPlaylists && userPlaylists.length > 0 ? (
              <div className="space-y-2">
                <Separator />
                <p className="text-sm font-medium text-muted-foreground">Your Playlists</p>
                <ScrollArea className="max-h-60">
                  <div className="space-y-1">
                    {userPlaylists.map((playlist) => {
                      const { title, trackCount } = getPlaylistInfo(playlist);

                      // Generate trackUrl based on track source
                      let trackUrl = '';
                      if (track) {
                        const unifiedTrack: UnifiedTrack = 'source' in track ? track : wavlakeToUnified(track);
                        if (unifiedTrack.source === 'wavlake') {
                          trackUrl = `https://wavlake.com/track/${unifiedTrack.sourceId}`;
                        } else if (unifiedTrack.source === 'podcastindex') {
                          trackUrl = unifiedTrack.mediaUrl;
                        }
                      }

                      const isAlreadyInPlaylist = track ? isTrackInPlaylist(playlist, trackUrl) : false;
                      const isAdding = addingToPlaylist === playlist.id;

                      return (
                        <Button
                          key={playlist.id}
                          onClick={() => handleAddToExistingPlaylist(playlist)}
                          disabled={isAlreadyInPlaylist || isAdding}
                          className="w-full justify-start h-auto p-3"
                          variant="ghost"
                        >
                          <div className="flex items-center gap-3 w-full">
                            <div className="h-12 w-12 rounded-md bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center flex-shrink-0">
                              <Music className="h-6 w-6 text-white" />
                            </div>
                            <div className="text-left flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{title}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{trackCount} track{trackCount !== 1 ? 's' : ''}</span>
                                <span>•</span>
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  <span>{formatDate(playlist.created_at)}</span>
                                </div>
                              </div>
                            </div>
                            {isAlreadyInPlaylist && (
                              <div className="flex items-center gap-1 text-green-600">
                                <Check className="h-4 w-4" />
                                <span className="text-xs">Added</span>
                              </div>
                            )}
                            {isAdding && (
                              <div className="text-xs text-muted-foreground">Adding...</div>
                            )}
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Music className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  You don't have any playlists yet.
                </p>
                <Button onClick={handleCreateNewPlaylist}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Playlist
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Playlist Dialog */}
      <CreatePlaylistDialog
        open={createPlaylistOpen}
        onOpenChange={setCreatePlaylistOpen}
        initialTracks={track ? [track] : []}
      />
    </>
  );
}