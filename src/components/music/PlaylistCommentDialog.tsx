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
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageCircle, Send, PlayCircle } from 'lucide-react';
import { useCommentOnPlaylist, usePlaylistComments } from '@/hooks/useNostrMusic';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAuthor } from '@/hooks/useAuthor';
import { useToast } from '@/hooks/useToast';
import { genUserName } from '@/lib/genUserName';
import { NoteContent } from '@/components/NoteContent';
import type { NostrEvent } from '@nostrify/nostrify';

interface PlaylistCommentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playlistEvent: NostrEvent | null;
}

export function PlaylistCommentDialog({ open, onOpenChange, playlistEvent }: PlaylistCommentDialogProps) {
  const [comment, setComment] = useState('');
  const { user } = useCurrentUser();
  const { mutate: commentOnPlaylist, isPending } = useCommentOnPlaylist();
  const { toast } = useToast();

  const { data: comments, isLoading: commentsLoading } = usePlaylistComments(playlistEvent);

  const getPlaylistInfo = (playlist: NostrEvent) => {
    const titleTag = playlist.tags.find(tag => tag[0] === 'title');
    const trackTags = playlist.tags.filter(tag => tag[0] === 'r');

    return {
      title: titleTag?.[1] || 'Untitled Playlist',
      trackCount: trackTags.length,
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!playlistEvent || !comment.trim()) return;

    const playlistInfo = getPlaylistInfo(playlistEvent);

    commentOnPlaylist(
      { content: comment.trim(), playlistEvent },
      {
        onSuccess: () => {
          toast({
            title: "Comment posted",
            description: `Your comment on "${playlistInfo.title}" has been published to Nostr.`,
          });
          setComment('');
          onOpenChange(false);
        },
        onError: (error) => {
          toast({
            title: "Failed to post comment",
            description: error.message,
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleClose = () => {
    setComment('');
    onOpenChange(false);
  };

  if (!playlistEvent) return null;

  const playlistInfo = getPlaylistInfo(playlistEvent);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <MessageCircle className="h-5 w-5" />
            <span>Comments</span>
          </DialogTitle>
          <DialogDescription>
            Share your thoughts about this playlist
          </DialogDescription>
        </DialogHeader>

        {/* Playlist Info */}
        <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
          <div className="h-12 w-12 rounded-md bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
            <PlayCircle className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm truncate">
              {playlistInfo.title}
            </h4>
            <p className="text-sm text-muted-foreground">
              {playlistInfo.trackCount} track{playlistInfo.trackCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Comments List */}
        <div className="flex-1 min-h-0 space-y-4">
          <h4 className="font-medium text-sm">
            Comments ({comments?.length || 0})
          </h4>

          <div className="space-y-4 max-h-60 overflow-y-auto">
            {commentsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex space-x-3 animate-pulse">
                    <div className="h-8 w-8 bg-muted rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-muted rounded w-1/4" />
                      <div className="h-4 bg-muted rounded w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : comments && comments.length > 0 ? (
              comments.map((commentEvent) => (
                <CommentItem key={commentEvent.id} event={commentEvent} />
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No comments yet. Be the first to share your thoughts!
              </p>
            )}
          </div>
        </div>

        {/* Comment Form */}
        {user && (
          <form onSubmit={handleSubmit} className="space-y-4 border-t pt-4">
            <Textarea
              placeholder="Share your thoughts about this playlist..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={280}
              rows={3}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending || !comment.trim()}
              >
                {isPending ? (
                  'Posting...'
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Post Comment
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}

        {!user && (
          <div className="border-t pt-4 text-center">
            <p className="text-sm text-muted-foreground">
              Sign in to post comments
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CommentItem({ event }: { event: NostrEvent }) {
  const author = useAuthor(event.pubkey);
  const metadata = author.data?.metadata;
  const displayName = metadata?.name ?? genUserName(event.pubkey);
  const profileImage = metadata?.picture;

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex space-x-3">
      <Avatar className="h-8 w-8">
        <AvatarImage src={profileImage} alt={displayName} />
        <AvatarFallback className="text-xs">
          {displayName.charAt(0)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <span className="font-medium text-sm truncate">
            {displayName}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDate(event.created_at)}
          </span>
        </div>
        <div className="text-sm mt-1">
          <NoteContent event={event} />
        </div>
      </div>
    </div>
  );
}