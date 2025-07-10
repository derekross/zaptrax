import React, { useState } from 'react';
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
import { useCreatePlaylist } from '@/hooks/useNostrMusic';
import { useToast } from '@/hooks/useToast';
import type { WavlakeTrack } from '@/lib/wavlake';

interface CreatePlaylistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTracks?: WavlakeTrack[];
}

export function CreatePlaylistDialog({
  open,
  onOpenChange,
  initialTracks = []
}: CreatePlaylistDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const { mutate: createPlaylist, isPending } = useCreatePlaylist();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for your playlist.",
        variant: "destructive",
      });
      return;
    }

    const trackUrls = initialTracks.map(track => `https://wavlake.com/track/${track.id}`);

    createPlaylist(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        tracks: trackUrls.length > 0 ? trackUrls : undefined,
      },
      {
        onSuccess: () => {
          toast({
            title: "Playlist created",
            description: `"${name}" has been created successfully.`,
          });
          setName('');
          setDescription('');
          onOpenChange(false);
        },
        onError: (error) => {
          toast({
            title: "Failed to create playlist",
            description: error.message,
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-md p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Create New Playlist</DialogTitle>
          <DialogDescription>
            Create a new playlist to organize your favorite tracks.
            {initialTracks.length > 0 && (
              <span className="block mt-1">
                {initialTracks.length} track{initialTracks.length !== 1 ? 's' : ''} will be added.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
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

          {initialTracks.length > 0 && (
            <div className="space-y-2">
              <Label>Initial Tracks</Label>
              <div className="max-h-32 overflow-y-auto space-y-1 p-2 border rounded-md bg-muted/50">
                {initialTracks.map((track) => (
                  <div key={track.id} className="text-sm">
                    <span className="font-medium">{track.title}</span>
                    <span className="text-muted-foreground"> - {track.artist}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isPending}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
              {isPending ? 'Creating...' : 'Create Playlist'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}