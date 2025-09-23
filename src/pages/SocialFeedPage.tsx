import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  Globe,
  MessageCircle,
  Heart,
  Plus,
  Music,
  PlayCircle,
  Zap,
  MoreHorizontal,
  Play,
  Loader2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSocialFeed } from '@/hooks/useSocialFeed';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAuthor } from '@/hooks/useAuthor';
import { useNostr } from '@nostrify/react';
import { useLikeNote, useNoteReactions } from '@/hooks/useNostrMusic';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { AddToPlaylistDialog } from '@/components/music/AddToPlaylistDialog';
import { CommentDialog } from '@/components/music/CommentDialog';
import { ZapDialog } from '@/components/music/ZapDialog';
import { NoteCommentDialog } from '@/components/music/NoteCommentDialog';
import { NoteContent } from '@/components/NoteContent';
import { genUserName } from '@/lib/genUserName';
import { wavlakeAPI } from '@/lib/wavlake';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import type { NostrEvent } from '@nostrify/nostrify';
import type { WavlakeTrack } from '@/lib/wavlake';

export function SocialFeedPage() {
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const [feedType, setFeedType] = useState<'following' | 'global'>('following');
  const [addToPlaylistOpen, setAddToPlaylistOpen] = useState(false);
  const [selectedTrackForPlaylist, setSelectedTrackForPlaylist] = useState<WavlakeTrack | null>(null);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [selectedTrackForComment, setSelectedTrackForComment] = useState<WavlakeTrack | null>(null);
  const [zapDialogOpen, setZapDialogOpen] = useState(false);
  const [selectedTrackForZap, setSelectedTrackForZap] = useState<WavlakeTrack | null>(null);
  const [noteCommentDialogOpen, setNoteCommentDialogOpen] = useState(false);
  const [selectedNoteForComment, setSelectedNoteForComment] = useState<NostrEvent | null>(null);

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useSocialFeed(feedType);

  // Flatten all pages into a single array of events
  const feedData = useMemo(() => {
    return data?.pages.flatMap(page => page.events) ?? [];
  }, [data]);

  // Set up infinite scroll
  const observerRef = useInfiniteScroll({
    hasNextPage: !!hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  });

  const handleAddToPlaylist = (track: WavlakeTrack) => {
    setSelectedTrackForPlaylist(track);
    setAddToPlaylistOpen(true);
  };

  const handleComment = (track: WavlakeTrack) => {
    setSelectedTrackForComment(track);
    setCommentDialogOpen(true);
  };

  const handleZap = (track: WavlakeTrack) => {
    setSelectedTrackForZap(track);
    setZapDialogOpen(true);
  };

  const handleCommentOnNote = (event: NostrEvent) => {
    setSelectedNoteForComment(event);
    setNoteCommentDialogOpen(true);
  };

  const handleUserClick = (pubkey: string) => {
    const npub = nip19.npubEncode(pubkey);
    navigate(`/profile/${npub}`);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white">
        {/* Header Section */}
        <div className="flex items-start gap-6 p-6 pb-8">
          {/* Social Icon */}
          <div className="flex-shrink-0">
            <div className="h-64 w-64 rounded-lg bg-gradient-to-br from-purple-600 via-purple-700 to-purple-900 flex items-center justify-center shadow-2xl">
              <Users className="h-24 w-24 text-white" />
            </div>
          </div>

          {/* Social Info */}
          <div className="flex-1 space-y-6 pt-16">
            <div>
              <h1 className="text-6xl font-bold mb-6 text-white">Social</h1>
              <div className="flex items-center gap-2 text-gray-300">
                <span className="text-white font-medium">Music Community</span>
                <span>•</span>
                <span>Social Feed</span>
                <span>•</span>
                <span>2025</span>
              </div>
              <p className="text-sm text-gray-400 mt-4 max-w-lg">
                Discover what your friends are listening to and sharing. Sign in to see activity from people you follow and join the conversation.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header Section */}
      <div className="flex items-start gap-6 p-6 pb-8">
        {/* Social Icon */}
        <div className="flex-shrink-0">
          <div className="h-64 w-64 rounded-lg bg-gradient-to-br from-purple-600 via-purple-700 to-purple-900 flex items-center justify-center shadow-2xl">
            <Users className="h-24 w-24 text-white" />
          </div>
        </div>

        {/* Social Info */}
        <div className="flex-1 space-y-6 pt-16">
          <div>
            <h1 className="text-6xl font-bold mb-6 text-white">Social</h1>
            <div className="flex items-center gap-2 text-gray-300">
              <span className="text-white font-medium">Music Community</span>
              <span>•</span>
              <span>Social Feed</span>
              <span>•</span>
              <span>2025</span>
            </div>
            <p className="text-sm text-gray-400 mt-4 max-w-lg">
              Discover what your friends are listening to and sharing. Follow users and see their music activity.
            </p>
          </div>
        </div>
      </div>

      {/* Feed Tabs */}
      <div className="px-6">
        <Tabs value={feedType} onValueChange={(value) => setFeedType(value as 'following' | 'global')}>
        <TabsList className="grid w-full grid-cols-2 bg-gray-900 border border-gray-800">
          <TabsTrigger value="following" className="flex items-center gap-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white text-gray-300">
            <Users className="h-4 w-4" />
            Following
          </TabsTrigger>
          <TabsTrigger value="global" className="flex items-center gap-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white text-gray-300">
            <Globe className="h-4 w-4" />
            Global
          </TabsTrigger>
        </TabsList>

        <TabsContent value={feedType} className="space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Card key={i} className="bg-gray-900 border-gray-800">
                  <CardContent className="p-4">
                    <div className="flex space-x-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-20 w-full" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : error ? (
            <Card className="border-dashed bg-gray-900 border-gray-800">
              <CardContent className="py-12 px-8 text-center">
                <div className="max-w-sm mx-auto space-y-4">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                    <MessageCircle className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Failed to load feed</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {error.message}
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => window.location.reload()}
                    >
                      Try Again
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : feedData && feedData.length > 0 ? (
            <div className="space-y-4">
              {feedData.map((event) => (
                <FeedItem
                  key={event.id}
                  event={event}
                  onAddToPlaylist={handleAddToPlaylist}
                  onComment={handleComment}
                  onZap={handleZap}
                  onCommentOnNote={handleCommentOnNote}
                  onUserClick={handleUserClick}
                />
              ))}

              {/* Infinite scroll trigger */}
              <div ref={observerRef} className="flex justify-center py-4 min-h-[1px]">
                {isFetchingNextPage ? (
                  <div className="space-y-4 w-full">
                    {/* Loading skeletons */}
                    {[...Array(3)].map((_, i) => (
                      <Card key={`loading-${i}`} className="bg-gray-900 border-gray-800">
                        <CardContent className="p-4">
                          <div className="flex space-x-3">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center space-x-2">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-4 w-16" />
                                <Skeleton className="h-3 w-12" />
                              </div>
                              <Skeleton className="h-20 w-full rounded-lg" />
                              <div className="flex space-x-2">
                                <Skeleton className="h-8 w-20" />
                                <Skeleton className="h-8 w-16" />
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    <div className="flex items-center justify-center space-x-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Loading more...</span>
                    </div>
                  </div>
                ) : hasNextPage ? (
                  <Button
                    variant="outline"
                    onClick={() => fetchNextPage()}
                    className="text-sm"
                  >
                    Load More
                  </Button>
                ) : feedData.length > 0 ? (
                  <div className="text-center text-sm text-muted-foreground">
                    You've reached the end of the feed
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <Card className="border-dashed bg-gray-900 border-gray-800">
              <CardContent className="py-12 px-8 text-center">
                <div className="max-w-sm mx-auto space-y-4">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                    <MessageCircle className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">No activity yet</h3>
                    <p className="text-sm text-muted-foreground">
                      {feedType === 'following'
                        ? "Follow some users to see their music activity here."
                        : "No recent music activity found."}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <AddToPlaylistDialog
        open={addToPlaylistOpen}
        onOpenChange={setAddToPlaylistOpen}
        track={selectedTrackForPlaylist}
      />

      <CommentDialog
        open={commentDialogOpen}
        onOpenChange={setCommentDialogOpen}
        track={selectedTrackForComment}
      />

      <ZapDialog
        open={zapDialogOpen}
        onOpenChange={setZapDialogOpen}
        track={selectedTrackForZap}
      />

      <NoteCommentDialog
        open={noteCommentDialogOpen}
        onOpenChange={setNoteCommentDialogOpen}
        event={selectedNoteForComment}
      />
    </div>
  );
}


interface PlaylistCommentReferenceProps {
  playlistAddress: string;
  playlistPubkey: string;
  playlistIdentifier: string;
}

function PlaylistCommentReference({ playlistAddress, playlistPubkey, playlistIdentifier }: PlaylistCommentReferenceProps) {
  const [playlist, setPlaylist] = useState<NostrEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const { nostr } = useNostr();
  const navigate = useNavigate();

  React.useEffect(() => {
    const loadPlaylist = async () => {
      try {
        const events = await nostr.query([
          {
            kinds: [30003],
            authors: [playlistPubkey],
            '#d': [playlistIdentifier],
            limit: 1,
          }
        ]);

        const latestPlaylist = events.sort((a, b) => b.created_at - a.created_at)[0];
        setPlaylist(latestPlaylist || null);
      } catch (error) {
        console.error('Failed to load playlist:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPlaylist();
  }, [playlistAddress, playlistPubkey, playlistIdentifier, nostr]);

  const handlePlaylistClick = () => {
    if (playlist) {
      const naddr = nip19.naddrEncode({
        kind: 30003,
        pubkey: playlist.pubkey,
        identifier: playlistIdentifier,
      });
      navigate(`/playlist/${naddr}`);
    }
  };

  if (loading) {
    return (
      <div className="p-3 bg-muted rounded-lg">
        <div className="flex items-center space-x-3">
          <Skeleton className="h-12 w-12 rounded-md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="p-3 bg-muted rounded-lg">
        <div className="flex items-center space-x-2">
          <PlayCircle className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Playlist not found</span>
        </div>
      </div>
    );
  }

  const titleTag = playlist.tags.find(tag => tag[0] === 'title');
  const title = titleTag?.[1] || 'Untitled Playlist';
  const trackTags = playlist.tags.filter(tag => tag[0] === 'r');
  const trackCount = trackTags.length;

  return (
    <div
      className="p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
      onClick={handlePlaylistClick}
    >
      <div className="flex items-center space-x-3">
        <div className="h-12 w-12 rounded-md bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
          <PlayCircle className="h-6 w-6 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate">
            {title}
          </h4>
          <p className="text-sm text-muted-foreground">
            {trackCount} track{trackCount !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="text-xs text-muted-foreground">
          View Playlist →
        </div>
      </div>
    </div>
  );
}

interface FeedItemProps {
  event: NostrEvent;
  onAddToPlaylist: (track: WavlakeTrack) => void;
  onComment: (track: WavlakeTrack) => void;
  onZap: (track: WavlakeTrack) => void;
  onCommentOnNote: (event: NostrEvent) => void;
  onUserClick: (pubkey: string) => void;
}

function FeedItem({ event, onAddToPlaylist, onComment, onZap, onCommentOnNote, onUserClick }: FeedItemProps) {
  const author = useAuthor(event.pubkey);
  const metadata = author.data?.metadata;
  const displayName = metadata?.name ?? genUserName(event.pubkey);
  const profileImage = metadata?.picture;
  const { user } = useCurrentUser();
  const { mutate: likeNote } = useLikeNote();
  const { data: noteReactions } = useNoteReactions(event.id);

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

  const getActivityType = () => {
    if (event.kind === 1) {
      // Check if it's a comment on a track
      const trackUrl = event.tags.find(tag => tag[0] === 'r' && tag[1]?.includes('wavlake.com/track/'));
      if (trackUrl) {
        return { type: 'comment', trackUrl: trackUrl[1] };
      }

      // Check if it has music-related hashtags
      const musicTags = event.tags.filter(tag =>
        tag[0] === 't' && ['music', 'nowplaying', 'track', 'song', 'album', 'artist', 'tunestr'].includes(tag[1]?.toLowerCase())
      );
      if (musicTags.length > 0) {
        return {
          type: 'music-note',
          musicTags: musicTags.map(tag => tag[1])
        };
      }

      // Default to general note
      return { type: 'note' };
    } else if (event.kind === 30003) {
      // Check if this is a "Liked Songs" playlist update
      const dTag = event.tags.find(tag => tag[0] === 'd')?.[1];
      const titleTag = event.tags.find(tag => tag[0] === 'title');
      const trackTags = event.tags.filter(tag => tag[0] === 'r');
      const trackUrls = trackTags.map(tag => tag[1]).filter(url => url?.includes('wavlake.com/track/'));

      if (dTag === 'liked-songs') {
        // This is a liked songs update - treat it as a like activity
        return {
          type: 'liked-songs-update',
          title: titleTag?.[1] || 'Liked Songs',
          trackCount: trackUrls.length,
          trackUrls
        };
      } else {
        // Regular playlist creation or update
        return {
          type: 'playlist',
          title: titleTag?.[1] || 'Untitled Playlist',
          trackCount: trackUrls.length,
          trackUrls
        };
      }
    } else if (event.kind === 7) {
      // Reaction (like)
      const trackUrl = event.tags.find(tag => tag[0] === 'r' && tag[1]?.includes('wavlake.com/track/'));
      if (trackUrl) {
        return { type: 'like', trackUrl: trackUrl[1] };
      }
    } else if (event.kind === 1111) {
      // Playlist comment
      const addressTag = event.tags.find(tag => tag[0] === 'A' && tag[1]?.startsWith('30003:'));
      if (addressTag) {
        const [, pubkey, identifier] = addressTag[1].split(':');
        return {
          type: 'playlist-comment',
          playlistAddress: addressTag[1],
          playlistPubkey: pubkey,
          playlistIdentifier: identifier
        };
      }
    }
    return { type: 'unknown' };
  };

  const activity = getActivityType();

  const handleLikeNote = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (user) {
      likeNote({
        noteId: event.id,
        authorPubkey: event.pubkey,
        wasLiked: userHasLiked
      });
      // Remove focus from the button to hide the focus ring
      e.currentTarget.blur();
    }
  };

  const userHasLiked = noteReactions?.likes.some(like => like.pubkey === user?.pubkey) || false;

  const getActivityIcon = () => {
    switch (activity.type) {
      case 'comment':
        return <MessageCircle className="h-4 w-4" />;
      case 'playlist':
        return <PlayCircle className="h-4 w-4" />;
      case 'liked-songs-update':
        return <Heart className="h-4 w-4 text-pink-500" />;
      case 'playlist-comment':
        return <MessageCircle className="h-4 w-4 text-purple-500" />;

      case 'music-note':
        return <Music className="h-4 w-4 text-purple-500" />;
      case 'note':
        return <MessageCircle className="h-4 w-4 text-gray-500" />;
      case 'like':
        return <Heart className="h-4 w-4 text-pink-500" />;
      default:
        return <Music className="h-4 w-4" />;
    }
  };

  const getActivityText = () => {
    switch (activity.type) {
      case 'comment':
        return 'commented on a track';
      case 'playlist':
        return (activity.trackCount || 0) > 0 ? 'updated a playlist' : 'created a playlist';
      case 'liked-songs-update':
        return 'liked a track';
      case 'playlist-comment':
        return 'commented on a playlist';

      case 'music-note':
        return `shared about ${activity.musicTags?.join(', ') || 'music'}`;
      case 'note':
        return 'shared a note';
      case 'like':
        return 'liked a track';
      default:
        return 'shared music';
    }
  };

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardContent className="p-4">
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
              <Badge variant="outline" className="text-xs">
                {getActivityIcon()}
                <span className="ml-1">{getActivityText()}</span>
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatDate(event.created_at)}
              </span>
            </div>

            <div className="space-y-3">
              {activity.type === 'comment' && activity.trackUrl && (
                <TrackReference
                  trackUrl={activity.trackUrl}
                  onAddToPlaylist={onAddToPlaylist}
                  onComment={onComment}
                  onZap={onZap}
                />
              )}

              {activity.type === 'playlist' && (
                <PlaylistReference
                  title={activity.title || 'Untitled Playlist'}
                  trackCount={activity.trackCount || 0}
                  trackUrls={activity.trackUrls || []}
                  onAddToPlaylist={onAddToPlaylist}
                  onComment={onComment}
                  onZap={onZap}
                />
              )}

              {activity.type === 'like' && activity.trackUrl && (
                <TrackReference
                  trackUrl={activity.trackUrl}
                  onAddToPlaylist={onAddToPlaylist}
                  onComment={onComment}
                  onZap={onZap}
                />
              )}

              {activity.type === 'liked-songs-update' && activity.trackUrls && activity.trackUrls.length > 0 && (
                <TrackReference
                  trackUrl={activity.trackUrls[activity.trackUrls.length - 1]} // Show the most recently added track
                  onAddToPlaylist={onAddToPlaylist}
                  onComment={onComment}
                  onZap={onZap}
                />
              )}

              {activity.type === 'playlist-comment' && activity.playlistAddress && (
                <PlaylistCommentReference
                  playlistAddress={activity.playlistAddress}
                  playlistPubkey={activity.playlistPubkey}
                  playlistIdentifier={activity.playlistIdentifier}
                />
              )}

              {activity.type === 'music-note' && activity.musicTags && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {activity.musicTags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Only show content for non-reaction events */}
              {event.kind !== 7 && (
                <div className="text-sm">
                  <NoteContent event={event} />
                </div>
              )}

              {/* Note Actions */}
              <div className="flex items-center space-x-4 pt-2 border-t border-border/50">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onCommentOnNote(event)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <MessageCircle className="h-4 w-4 mr-1" />
                  Comment
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLikeNote}
                  disabled={!user}
                  className={cn(
                    "text-muted-foreground hover:text-foreground",
                    userHasLiked && "text-pink-500 hover:text-pink-600"
                  )}
                >
                  <Heart className={cn("h-4 w-4 mr-1", userHasLiked && "fill-current")} />
                  Like
                  {noteReactions && noteReactions.likeCount > 0 && (
                    <span className="ml-1 text-xs">({noteReactions.likeCount})</span>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface TrackReferenceProps {
  trackUrl: string;
  onAddToPlaylist: (track: WavlakeTrack) => void;
  onComment: (track: WavlakeTrack) => void;
  onZap: (track: WavlakeTrack) => void;
}

function TrackReference({ trackUrl, onAddToPlaylist, onComment, onZap }: TrackReferenceProps) {
  const [track, setTrack] = useState<WavlakeTrack | null>(null);
  const [loading, setLoading] = useState(true);
  const { playTrack } = useMusicPlayer();
  const { user } = useCurrentUser();

  React.useEffect(() => {
    const loadTrack = async () => {
      try {
        const trackId = trackUrl.split('/track/')[1];
        if (trackId) {
          const trackData = await wavlakeAPI.getTrack(trackId);
          const fullTrack = Array.isArray(trackData) ? trackData[0] : trackData;
          setTrack(fullTrack);
        }
      } catch (error) {
        console.error('Failed to load track:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTrack();
  }, [trackUrl]);

  if (loading) {
    return (
      <div className="p-3 bg-muted rounded-lg">
        <div className="flex items-center space-x-3">
          <Skeleton className="h-12 w-12 rounded-md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (!track) {
    return (
      <div className="p-3 bg-muted rounded-lg">
        <div className="flex items-center space-x-2">
          <Music className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Track not found</span>
        </div>
      </div>
    );
  }

  const handlePlay = () => {
    playTrack(track, [track]);
  };

  return (
    <div className="p-3 bg-muted rounded-lg">
      <div className="flex items-center space-x-3">
        <Avatar className="h-12 w-12 rounded-md">
          <AvatarImage src={track.albumArtUrl} alt={track.albumTitle} />
          <AvatarFallback className="rounded-md">
            <Music className="h-6 w-6" />
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

        <div className="flex items-center space-x-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={handlePlay}
            className="h-8 w-8"
          >
            <Play className="h-4 w-4" />
          </Button>

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onAddToPlaylist(track)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add to Playlist
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onComment(track)}>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Comment
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onZap(track)}>
                  <Zap className="h-4 w-4 mr-2" />
                  Zap
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.open(trackUrl, '_blank')}>
                  <Music className="h-4 w-4 mr-2" />
                  View on Wavlake
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  );
}

interface PlaylistReferenceProps {
  title: string;
  trackCount: number;
  trackUrls: string[];
  onAddToPlaylist: (track: WavlakeTrack) => void;
  onComment: (track: WavlakeTrack) => void;
  onZap: (track: WavlakeTrack) => void;
}

function PlaylistReference({ title, trackCount, trackUrls, onAddToPlaylist, onComment, onZap }: PlaylistReferenceProps) {
  const [firstTrack, setFirstTrack] = useState<WavlakeTrack | null>(null);
  const [loading, setLoading] = useState(true);
  const { playTrack } = useMusicPlayer();
  const { user } = useCurrentUser();

  React.useEffect(() => {
    const loadFirstTrack = async () => {
      try {
        if (trackUrls.length > 0) {
          const firstTrackUrl = trackUrls[0];
          const trackId = firstTrackUrl.split('/track/')[1];
          if (trackId) {
            const trackData = await wavlakeAPI.getTrack(trackId);
            const fullTrack = Array.isArray(trackData) ? trackData[0] : trackData;
            setFirstTrack(fullTrack);
          }
        }
      } catch (error) {
        console.error('Failed to load first track:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFirstTrack();
  }, [trackUrls]);

  const handlePlayPlaylist = async () => {
    if (trackUrls.length === 0) return;

    try {
      // Load all tracks in the playlist
      const tracks = await Promise.all(
        trackUrls.map(async (url) => {
          try {
            const trackId = url.split('/track/')[1];
            if (trackId) {
              const trackData = await wavlakeAPI.getTrack(trackId);
              return Array.isArray(trackData) ? trackData[0] : trackData;
            }
            return null;
          } catch (e) {
            console.error('Failed to load track:', url, e);
            return null;
          }
        })
      );

      const validTracks = tracks.filter(track => track !== null) as WavlakeTrack[];
      if (validTracks.length > 0) {
        playTrack(validTracks[0], validTracks);
      }
    } catch (error) {
      console.error('Failed to play playlist:', error);
    }
  };

  if (loading && trackUrls.length > 0) {
    return (
      <div className="p-3 bg-muted rounded-lg">
        <div className="flex items-center space-x-3">
          <Skeleton className="h-12 w-12 rounded-md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 bg-muted rounded-lg">
      <div className="flex items-center space-x-3">
        {firstTrack ? (
          <Avatar className="h-12 w-12 rounded-md">
            <AvatarImage src={firstTrack.albumArtUrl} alt={firstTrack.albumTitle} />
            <AvatarFallback className="rounded-md">
              <Music className="h-6 w-6" />
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="h-12 w-12 rounded-md bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
            <PlayCircle className="h-6 w-6 text-white" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate">
            {title}
          </h4>
          <p className="text-sm text-muted-foreground">
            {trackCount} track{trackCount !== 1 ? 's' : ''}
            {firstTrack && ` • ${firstTrack.artist}`}
          </p>
        </div>

        <div className="flex items-center space-x-1">
          {trackUrls.length > 0 && (
            <Button
              size="icon"
              variant="ghost"
              onClick={handlePlayPlaylist}
              className="h-8 w-8"
            >
              <Play className="h-4 w-4" />
            </Button>
          )}

          {user && firstTrack && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onAddToPlaylist(firstTrack)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Track to Playlist
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onComment(firstTrack)}>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Comment on Track
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onZap(firstTrack)}>
                  <Zap className="h-4 w-4 mr-2" />
                  Zap Track
                </DropdownMenuItem>
                {trackUrls[0] && (
                  <DropdownMenuItem onClick={() => window.open(trackUrls[0], '_blank')}>
                    <Music className="h-4 w-4 mr-2" />
                    View on Wavlake
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  );
}