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
import { useCommentOnTrack, useTrackComments } from '@/hooks/useNostrMusic';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAuthor } from '@/hooks/useAuthor';
import { useToast } from '@/hooks/useToast';
import { genUserName } from '@/lib/genUserName';
import { NoteContent } from '@/components/NoteContent';
import { useNavigate } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import type { WavlakeTrack } from '@/lib/wavlake';
import type { UnifiedTrack } from '@/lib/unifiedTrack';
import type { NostrEvent } from '@nostrify/nostrify';

interface CommentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  track: UnifiedTrack | WavlakeTrack | null;
}

export function CommentDialog({ open, onOpenChange, track }: CommentDialogProps) {
  const [comment, setComment] = useState('');
  const { user } = useCurrentUser();
  const { mutate: commentOnTrack, isPending } = useCommentOnTrack();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Generate correct URL based on track source
  const trackUrl = track ? (() => {
    if ('source' in track) {
      // UnifiedTrack
      const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;

      if (track.source === 'wavlake') {
        // Wavlake: use app URL to album page
        return `${baseUrl}/album/${track.albumId}`;
      } else if (track.source === 'podcastindex') {
        // PodcastIndex: use app URL to feed page
        return `${baseUrl}/feed/${track.feedId}`;
      }
    } else {
      // WavlakeTrack (backward compatibility)
      const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
      return `${baseUrl}/album/${track.albumId}`;
    }
    return '';
  })() : '';

  const { data: comments, isLoading: commentsLoading } = useTrackComments(trackUrl);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!track || !comment.trim()) return;

    const content = `${comment.trim()}

🎵 ${track.title} - ${track.artist}
${trackUrl}`;

    commentOnTrack(
      { content, trackUrl },
      {
        onSuccess: () => {
          toast({
            title: "Comment posted",
            description: "Your comment has been published to Nostr.",
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

  const handleUserClick = (pubkey: string) => {
    const npub = nip19.npubEncode(pubkey);
    navigate(`/profile/${npub}`);
    handleClose(); // Close dialog when navigating
  };

  if (!track) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <MessageCircle className="h-5 w-5" />
            <span>Comments</span>
          </DialogTitle>
          <DialogDescription>
            Share your thoughts about this track
          </DialogDescription>
        </DialogHeader>

        {/* Track Info */}
        <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
          <Avatar className="h-12 w-12 rounded-md">
            <AvatarImage src={track.albumArtUrl} alt={track.albumTitle} />
            <AvatarFallback className="rounded-md">
              {track.title.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm truncate">
              {track.title}
            </h4>
            <p className="text-sm text-muted-foreground truncate">
              {track.artist}
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
                <CommentItem key={commentEvent.id} event={commentEvent} onUserClick={handleUserClick} />
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
              placeholder="Share your thoughts about this track..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={280}
              rows={3}
              className="bg-muted border-gray-700"
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