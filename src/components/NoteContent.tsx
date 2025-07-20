import { useMemo } from 'react';
import { type NostrEvent } from '@nostrify/nostrify';
import { Link } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';
import { VideoContent } from '@/components/VideoPlayer';
import { cn } from '@/lib/utils';

interface NoteContentProps {
  event: NostrEvent;
  className?: string;
}

/** Parses content of text note events so that URLs and hashtags are linkified. */
export function NoteContent({
  event,
  className,
}: NoteContentProps) {
  // Check if the note has music-related hashtags
  const hasMusicHashtags = useMemo(() => {
    return event.tags.some(tag =>
      tag[0] === 't' &&
      ['music', 'nowplaying', 'track', 'song', 'album', 'artist', 'tunestr'].includes(tag[1]?.toLowerCase())
    );
  }, [event.tags]);

  // Extract video URLs from content for rendering
  const videoUrls = useMemo(() => {
    if (!hasMusicHashtags) return [];

    const text = event.content;
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = urlRegex.exec(text)) !== null) {
      const url = match[0];

      // Check if it's a YouTube URL or video file
      const isYouTube = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)/.test(url);
      const isVideoFile = /\.(mp4|mov|webm|ogg|avi|mkv|m4v|3gp|flv)(\?|$)/i.test(url);

      if (isYouTube || isVideoFile) {
        urls.push(url);
      }
    }

    return urls;
  }, [event.content, hasMusicHashtags]);

  // Process the content to render mentions, links, etc.
  const content = useMemo(() => {
    const text = event.content;

    // Regex to find URLs, Nostr references, and hashtags
    const regex = /(https?:\/\/[^\s]+)|nostr:(npub1|note1|nprofile1|nevent1)([023456789acdefghjklmnpqrstuvwxyz]+)|(#\w+)/g;

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let keyCounter = 0;

    while ((match = regex.exec(text)) !== null) {
      const [fullMatch, url, nostrPrefix, nostrData, hashtag] = match;
      const index = match.index;

      // Add text before this match
      if (index > lastIndex) {
        parts.push(text.substring(lastIndex, index));
      }

      if (url) {
        // Check if this URL is a video that we'll render separately
        const isVideoUrl = videoUrls.includes(url);

        if (isVideoUrl) {
          // For video URLs in music posts, just show a simple link since we'll render the video below
          parts.push(
            <a
              key={`video-link-${keyCounter++}`}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline text-sm"
            >
              🎵 {url.length > 50 ? `${url.substring(0, 50)}...` : url}
            </a>
          );
        } else {
          // Handle regular URLs
          parts.push(
            <a
              key={`url-${keyCounter++}`}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              {url}
            </a>
          );
        }
      } else if (nostrPrefix && nostrData) {
        // Handle Nostr references
        try {
          const nostrId = `${nostrPrefix}${nostrData}`;
          const decoded = nip19.decode(nostrId);

          if (decoded.type === 'npub') {
            const pubkey = decoded.data;
            parts.push(
              <NostrMention key={`mention-${keyCounter++}`} pubkey={pubkey} />
            );
          } else {
            // For other types, just show as a link
            parts.push(
              <Link
                key={`nostr-${keyCounter++}`}
                to={`/${nostrId}`}
                className="text-blue-500 hover:underline"
              >
                {fullMatch}
              </Link>
            );
          }
        } catch {
          // If decoding fails, just render as text
          parts.push(fullMatch);
        }
      } else if (hashtag) {
        // Handle hashtags
        const tag = hashtag.slice(1); // Remove the #
        parts.push(
          <Link
            key={`hashtag-${keyCounter++}`}
            to={`/t/${tag}`}
            className="text-blue-500 hover:underline"
          >
            {hashtag}
          </Link>
        );
      }

      lastIndex = index + fullMatch.length;
    }

    // Add any remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    // If no special content was found, just use the plain text
    if (parts.length === 0) {
      parts.push(text);
    }

    return parts;
  }, [event, videoUrls]);

  return (
    <div className={cn("whitespace-pre-wrap break-words", className)}>
      {content.length > 0 ? content : event.content}

      {/* Render videos for music posts */}
      {videoUrls.length > 0 && (
        <div className="mt-4 space-y-3">
          {videoUrls.map((url, index) => (
            <VideoContent
              key={`video-${index}`}
              url={url}
              className="max-w-full"
              autoPlay={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Helper component to display user mentions
function NostrMention({ pubkey }: { pubkey: string }) {
  const author = useAuthor(pubkey);
  const npub = nip19.npubEncode(pubkey);
  const hasRealName = !!author.data?.metadata?.name;
  const displayName = author.data?.metadata?.name ?? genUserName(pubkey);

  return (
    <Link
      to={`/profile/${npub}`}
      className={cn(
        "font-medium hover:underline",
        hasRealName
          ? "text-blue-500"
          : "text-gray-500 hover:text-gray-700"
      )}
    >
      @{displayName}
    </Link>
  );
}