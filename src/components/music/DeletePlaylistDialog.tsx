import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useDeletePlaylist } from '@/hooks/useNostrMusic';
import { useToast } from '@/hooks/useToast';
import type { NostrEvent } from '@nostrify/nostrify';

interface DeletePlaylistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playlist: NostrEvent | null;
}

export function DeletePlaylistDialog({ 
  open, 
  onOpenChange, 
  playlist 
}: DeletePlaylistDialogProps) {
  const { mutate: deletePlaylist, isPending } = useDeletePlaylist();
  const { toast } = useToast();

  const getPlaylistName = () => {
    if (!playlist) return 'this playlist';
    const titleTag = playlist.tags.find(tag => tag[0] === 'title');
    return titleTag?.[1] || 'Untitled Playlist';
  };

  const getTrackCount = () => {
    if (!playlist) return 0;
    return playlist.tags.filter(tag => tag[0] === 'r').length;
  };

  const handleDelete = () => {
    if (!playlist) return;

    deletePlaylist(
      { playlistEvent: playlist },
      {
        onSuccess: () => {
          toast({
            title: "Playlist deleted",
            description: `"${getPlaylistName()}" has been deleted successfully.`,
          });
          onOpenChange(false);
        },
        onError: (error) => {
          toast({
            title: "Failed to delete playlist",
            description: error.message,
            variant: "destructive",
          });
        },
      }
    );
  };

  const playlistName = getPlaylistName();
  const trackCount = getTrackCount();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Playlist</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{playlistName}"? 
            {trackCount > 0 && (
              <span className="block mt-1">
                This playlist contains {trackCount} track{trackCount !== 1 ? 's' : ''}.
              </span>
            )}
            <span className="block mt-2 font-medium">
              This action cannot be undone.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isPending}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {isPending ? 'Deleting...' : 'Delete Playlist'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}