import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, Share2, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { nip19 } from 'nostr-tools';
import type { NostrEvent } from '@nostrify/nostrify';

interface SharePlaylistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playlist: NostrEvent | null;
}

export function SharePlaylistDialog({
  open,
  onOpenChange,
  playlist
}: SharePlaylistDialogProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { toast } = useToast();

  const getPlaylistInfo = () => {
    if (!playlist) return { name: '', description: '', trackCount: 0 };

    const titleTag = playlist.tags.find(tag => tag[0] === 'title');
    const descriptionTag = playlist.tags.find(tag => tag[0] === 'description');
    const trackTags = playlist.tags.filter(tag => tag[0] === 'r');
    const dTag = playlist.tags.find(tag => tag[0] === 'd');

    return {
      name: titleTag?.[1] || 'Untitled Playlist',
      description: descriptionTag?.[1] || '',
      trackCount: trackTags.length,
      identifier: dTag?.[1] || '',
    };
  };

  const generateShareUrls = () => {
    if (!playlist) return { naddr: '', webUrl: '', nostrUrl: '' };

    const { identifier } = getPlaylistInfo();

    if (!identifier) {
      return { naddr: '', webUrl: '', nostrUrl: '' };
    }

    // Generate naddr (NIP-19 addressable identifier)
    const naddr = nip19.naddrEncode({
      identifier,
      pubkey: playlist.pubkey,
      kind: playlist.kind,
    });

    // Generate web URL (assuming your app's domain)
    const webUrl = `${window.location.origin}/playlist/${naddr}`;

    // Generate nostr: URL for native clients
    const nostrUrl = `nostr:${naddr}`;

    return { naddr, webUrl, nostrUrl };
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
      toast({
        title: "Copied to clipboard",
        description: "The link has been copied to your clipboard.",
      });
    } catch {
      toast({
        title: "Failed to copy",
        description: "Could not copy to clipboard. Please try again.",
        variant: "destructive",
      });
    }
  };

  const shareNative = async () => {
    if (!navigator.share) {
      toast({
        title: "Sharing not supported",
        description: "Your browser doesn't support native sharing.",
        variant: "destructive",
      });
      return;
    }

    const { name } = getPlaylistInfo();
    const { webUrl } = generateShareUrls();

    try {
      await navigator.share({
        title: `${name} - Nostr Playlist`,
        text: `Check out this playlist: ${name}`,
        url: webUrl,
      });
    } catch {
      // User cancelled sharing or error occurred
      // Silently handle the error as it's expected behavior
    }
  };

  if (!playlist) return null;

  const { name, description, trackCount } = getPlaylistInfo();
  const { naddr, webUrl, nostrUrl } = generateShareUrls();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Share2 className="h-5 w-5" />
            <span>Share Playlist</span>
          </DialogTitle>
          <DialogDescription>
            Share "{name}" with others
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Playlist Info */}
          <div className="p-3 bg-muted/50 rounded-md">
            <h4 className="font-medium text-sm">{name}</h4>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
            <Badge variant="outline" className="mt-2 text-xs">
              {trackCount} track{trackCount !== 1 ? 's' : ''}
            </Badge>
          </div>

          {/* Web URL */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Web Link</Label>
            <div className="flex space-x-2">
              <Input
                value={webUrl}
                readOnly
                className="text-xs sm:text-xs text-base"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(webUrl, 'web')}
                className="flex-shrink-0"
              >
                {copiedField === 'web' ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Share this link to view the playlist in a web browser
            </p>
          </div>

          {/* Nostr Address */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Nostr Address</Label>
            <div className="flex space-x-2">
              <Input
                value={naddr}
                readOnly
                className="text-xs sm:text-xs text-base font-mono"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(naddr, 'naddr')}
                className="flex-shrink-0"
              >
                {copiedField === 'naddr' ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Use this address in Nostr clients to access the playlist
            </p>
          </div>

          {/* Nostr URL */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Nostr URL</Label>
            <div className="flex space-x-2">
              <Input
                value={nostrUrl}
                readOnly
                className="text-xs sm:text-xs text-base font-mono"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(nostrUrl, 'nostr')}
                className="flex-shrink-0"
              >
                {copiedField === 'nostr' ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Opens directly in Nostr-compatible applications
            </p>
          </div>

          {/* Native Share Button */}
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <div className="pt-2">
              <Button
                onClick={shareNative}
                className="w-full"
                variant="outline"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Share via System
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}