import React, { useState, useEffect } from 'react';

interface EditableTrackItemProps {
  trackUrl: string;
  onRemove: (trackUrl: string) => void;
  isRemoving: boolean;
}

function EditableTrackItem({ trackUrl, onRemove, isRemoving }: EditableTrackItemProps) {
  // Extract track ID from URL
  const trackId = trackUrl.substring(trackUrl.lastIndexOf('/') + 1);
  const { data: trackData, isLoading, isError } = useWavlakeTrack(trackId);
  const track = Array.isArray(trackData) ? trackData[0] : trackData;

  const getTrackDisplay = () => {
    if (isLoading) {
      return {
        title: 'Loading...',
        artist: '',
        artwork: null,
        duration: null,
      };
    }

    if (isError || !track) {
      // Try to extract some info from URL or show fallback
      const urlParts = trackUrl.split('/');
      const trackId = urlParts[urlParts.length - 1];
      return {
        title: `Track ${trackId}`,
        artist: 'Failed to load track info',
        artwork: null,
        duration: null,
      };
    }

    return {
      title: track.title,
      artist: track.artist,
      artwork: track.albumArtUrl,
      duration: track.duration,
    };
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const { title, artist, artwork, duration } = getTrackDisplay();

  return (
    <div className={`flex items-center justify-between p-2 sm:p-3 bg-muted/50 rounded-md group hover:bg-muted/70 transition-colors ${isError ? 'border border-red-200' : ''}`}>
      <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
        {/* Track Artwork */}
        <div className="relative flex-shrink-0">
          {artwork ? (
            <img
              src={artwork}
              alt={title}
              className="h-8 w-8 sm:h-10 sm:w-10 rounded object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          <div className={`${artwork ? 'hidden' : ''} h-8 w-8 sm:h-10 sm:w-10 bg-muted-foreground/20 rounded flex items-center justify-center`}>
            <Music className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
          </div>
        </div>

        {/* Track Info */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm sm:text-sm font-medium truncate ${isError ? 'text-red-600' : ''}`}>
            {isLoading ? (
              <span className="animate-pulse bg-muted-foreground/20 rounded h-4 w-32 inline-block" />
            ) : (
              title
            )}
          </p>
          <div className="flex items-center justify-between">
            <p className={`text-xs sm:text-xs truncate ${isError ? 'text-red-500' : 'text-muted-foreground'}`}>
              {isLoading ? (
                <span className="animate-pulse bg-muted-foreground/20 rounded h-3 w-24 inline-block" />
              ) : (
                artist
              )}
            </p>
            {duration && !isLoading && !isError && (
              <span className="text-xs text-muted-foreground ml-1 sm:ml-2 flex-shrink-0">
                {formatDuration(duration)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Remove Button */}
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => onRemove(trackUrl)}
        disabled={isRemoving}
        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0"
        title="Remove track"
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, Music } from 'lucide-react';
import { useEditPlaylist, useRemoveFromPlaylist } from '@/hooks/useNostrMusic';
import { useWavlakeTrack } from '@/hooks/useWavlake';
import { useToast } from '@/hooks/useToast';
import type { NostrEvent } from '@nostrify/nostrify';

interface EditPlaylistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playlist: NostrEvent | null;
}

export function EditPlaylistDialog({
  open,
  onOpenChange,
  playlist
}: EditPlaylistDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tracks, setTracks] = useState<string[]>([]);

  const { mutate: editPlaylist, isPending: isEditing } = useEditPlaylist();
  const { mutate: removeFromPlaylist, isPending: isRemoving } = useRemoveFromPlaylist();
  const { toast } = useToast();

  // Initialize form data when playlist changes
  useEffect(() => {
    if (playlist) {
      const titleTag = playlist.tags.find(tag => tag[0] === 'title');
      const descriptionTag = playlist.tags.find(tag => tag[0] === 'description');
      const trackTags = playlist.tags.filter(tag => tag[0] === 'r');

      setName(titleTag?.[1] || '');
      setDescription(descriptionTag?.[1] || '');
      setTracks(trackTags.map(tag => tag[1]));
    }
  }, [playlist]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!playlist) return;

    if (!name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for your playlist.",
        variant: "destructive",
      });
      return;
    }

    editPlaylist(
      {
        playlistEvent: playlist,
        name: name.trim(),
        description: description.trim() || undefined,
        tracks: tracks.length > 0 ? tracks : undefined,
      },
      {
        onSuccess: () => {
          toast({
            title: "Playlist updated",
            description: `"${name}" has been updated successfully.`,
          });
          onOpenChange(false);
        },
        onError: (error) => {
          toast({
            title: "Failed to update playlist",
            description: error.message,
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleRemoveTrack = (trackUrl: string) => {
    if (!playlist) return;

    removeFromPlaylist(
      { playlistEvent: playlist, trackUrl },
      {
        onSuccess: () => {
          setTracks(prev => prev.filter(url => url !== trackUrl));
          toast({
            title: "Track removed",
            description: "Track has been removed from the playlist.",
          });
        },
        onError: (error) => {
          toast({
            title: "Failed to remove track",
            description: error.message,
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleClose = () => {
    onOpenChange(false);
  };



  if (!playlist) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-2xl h-[90vh] sm:h-[80vh] flex flex-col p-4 sm:p-6">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Edit Playlist</DialogTitle>
          <DialogDescription>
            Update your playlist details and manage tracks.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex-shrink-0 space-y-3 sm:space-y-4 mb-4">
            <div className="space-y-2">
              <Label htmlFor="playlist-name" className="text-sm font-medium">Name *</Label>
              <Input
                id="playlist-name"
                placeholder="My Awesome Playlist"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                className="text-base sm:text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="playlist-description" className="text-sm font-medium">Description</Label>
              <Textarea
                id="playlist-description"
                placeholder="A collection of my favorite tracks..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                rows={2}
                className="text-base sm:text-sm resize-none"
              />
            </div>
          </div>

          {tracks.length > 0 && (
            <div className="space-y-2 flex-1 min-h-0 flex flex-col">
              <Label>Tracks ({tracks.length})</Label>
              <ScrollArea className="flex-1 border rounded-md p-2">
                <div className="space-y-2">
                  {tracks.map((trackUrl, index) => (
                    <EditableTrackItem
                      key={`${trackUrl}-${index}`}
                      trackUrl={trackUrl}
                      onRemove={handleRemoveTrack}
                      isRemoving={isRemoving}
                    />
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {tracks.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-center text-muted-foreground border rounded-md bg-muted/20">
              <div>
                <Music className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No tracks in this playlist</p>
                <p className="text-xs mt-1">Add tracks to get started</p>
              </div>
            </div>
          )}

        </div>

        <DialogFooter className="flex-shrink-0 flex-col sm:flex-row gap-2 sm:gap-0 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isEditing}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isEditing}
            className="w-full sm:w-auto"
          >
            {isEditing ? 'Updating...' : 'Update Playlist'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}