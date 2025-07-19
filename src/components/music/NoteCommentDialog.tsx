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
import { MessageCircle, Send } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAuthor } from '@/hooks/useAuthor';
import { useToast } from '@/hooks/useToast';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useNoteComments } from '@/hooks/useNostrMusic';
import { useQueryClient } from '@tanstack/react-query';
import { genUserName } from '@/lib/genUserName';
import { NoteContent } from '@/components/NoteContent';
import { nip19 } from 'nostr-tools';
import { useNavigate } from 'react-router-dom';
import type { NostrEvent } from '@nostrify/nostrify';

interface NoteCommentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: NostrEvent | null;
}

export function NoteCommentDialog({ open, onOpenChange, event }: NoteCommentDialogProps) {
  const [comment, setComment] = useState('');
  const { user } = useCurrentUser();
  const { mutate: createEvent, isPending } = useNostrPublish();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: comments, isLoading: commentsLoading } = useNoteComments(event?.id || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!event || !comment.trim()) return;

    createEvent(
      {
        kind: 1,
        content: comment.trim(),
        tags: [
          ['e', event.id, '', 'reply'],
          ['p', event.pubkey],
        ],
      },
      {
        onSuccess: () => {
          toast({
            title: "Comment posted",
            description: "Your comment has been published to Nostr.",
          });
          setComment('');
          onOpenChange(false);
          // Invalidate note comments and social feed
          queryClient.invalidateQueries({ queryKey: ['note-comments', event.id] });
          queryClient.invalidateQueries({ queryKey: ['social-feed'] });
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

  const handleUserClick = (pubkey: string) => {
    const npub = nip19.npubEncode(pubkey);
    navigate(`/profile/${npub}`);
    handleClose(); // Close dialog when navigating
  };

  if (!event) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <MessageCircle className="h-5 w-5" />
            <span>Comments</span>
          </DialogTitle>
          <DialogDescription>
            Reply to this post
          </DialogDescription>
        </DialogHeader>

        {/* Original Note */}
        <OriginalNote event={event} onUserClick={handleUserClick} />

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
                <CommentItem key={commentEvent.id} event={commentEvent} onUserClick={handleUserClick} />
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No comments yet. Be the first to reply!
              </p>
            )}
          </div>
        </div>

        {/* Comment Form */}
        {user && (
          <form onSubmit={handleSubmit} className="space-y-4 border-t pt-4">
            <Textarea
              placeholder="Write your reply..."
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
                    Post Reply
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

function OriginalNote({ event, onUserClick }: { event: NostrEvent; onUserClick: (pubkey: string) => void }) {
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
    <div className="p-3 bg-muted rounded-lg">
      <div className="flex space-x-3">
        <Avatar
          className="h-10 w-10 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => onUserClick(event.pubkey)}
        >
          <AvatarImage src={profileImage} alt={displayName} />
          <AvatarFallback>
            {displayName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-2">
            <span
              className="font-medium text-sm truncate cursor-pointer hover:underline"
              onClick={() => onUserClick(event.pubkey)}
            >
              {displayName}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDate(event.created_at)}
            </span>
          </div>
          <div className="text-sm">
            <NoteContent event={event} />
          </div>
        </div>
      </div>
    </div>
  );
}

function CommentItem({ event, onUserClick }: { event: NostrEvent; onUserClick: (pubkey: string) => void }) {
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
      <Avatar
        className="h-8 w-8 cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => onUserClick(event.pubkey)}
      >
        <AvatarImage src={profileImage} alt={displayName} />
        <AvatarFallback className="text-xs">
          {displayName.charAt(0)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <span
            className="font-medium text-sm truncate cursor-pointer hover:underline"
            onClick={() => onUserClick(event.pubkey)}
          >
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