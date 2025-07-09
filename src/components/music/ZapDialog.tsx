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
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Zap, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { wavlakeAPI } from '@/lib/wavlake';
import type { WavlakeTrack } from '@/lib/wavlake';

interface ZapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  track: WavlakeTrack | null;
}

const WAVLAKE_APP_ID = 'nostr-music-app'; // You would get this from Wavlake

export function ZapDialog({ open, onOpenChange, track }: ZapDialogProps) {
  const [amount, setAmount] = useState('1000');
  const [comment, setComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleZap = async () => {
    if (!track) return;

    setIsLoading(true);
    try {
      // Get LNURL for the track
      const lnurlResponse = await wavlakeAPI.getLnurl(track.id, WAVLAKE_APP_ID);

      // Create a zap request event (NIP-57) and send to LNURL callback
      // This would normally create a proper zap request and get an invoice

      // For now, just open the LNURL in a new tab
      window.open(`lightning:${lnurlResponse.lnurl}`, '_blank');

      toast({
        title: "Zap initiated",
        description: `Opening lightning wallet to zap ${amount} sats to "${track.title}"`,
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Zap failed:', error);
      toast({
        title: "Zap failed",
        description: "Failed to create zap. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setAmount('1000');
    setComment('');
    onOpenChange(false);
  };

  const formatSats = (sats: string) => {
    const num = parseInt(sats);
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const presetAmounts = ['100', '500', '1000', '5000', '10000'];

  if (!track) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            <span>Zap Track</span>
          </DialogTitle>
          <DialogDescription>
            Send sats to support this track and artist
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
            {track.msatTotal && (
              <Badge variant="outline" className="text-xs mt-1">
                ⚡ {formatSats((parseInt(track.msatTotal) / 1000).toString())} earned
              </Badge>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {/* Amount Selection */}
          <div className="space-y-2">
            <Label htmlFor="zap-amount">Amount (sats)</Label>
            <div className="flex space-x-2 mb-2">
              {presetAmounts.map((preset) => (
                <Button
                  key={preset}
                  size="sm"
                  variant={amount === preset ? "default" : "outline"}
                  onClick={() => setAmount(preset)}
                  className="text-xs"
                >
                  {formatSats(preset)}
                </Button>
              ))}
            </div>
            <Input
              id="zap-amount"
              type="number"
              placeholder="1000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="1"
            />
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="zap-comment">Comment (optional)</Label>
            <Textarea
              id="zap-comment"
              placeholder="Great track! 🎵"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={280}
              rows={2}
            />
          </div>

          {/* Artist Info */}
          {track.artistNpub && (
            <div className="text-xs text-muted-foreground">
              <p>Artist: {track.artistNpub}</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col space-y-2">
          <div className="flex space-x-2 w-full">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleZap}
              disabled={isLoading || !amount || parseInt(amount) < 1}
              className="flex-1"
            >
              {isLoading ? 'Creating Zap...' : `⚡ Zap ${formatSats(amount)} sats`}
            </Button>
          </div>

          <div className="text-xs text-muted-foreground text-center">
            <p>
              Powered by{' '}
              <a
                href="https://wavlake.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center"
              >
                Wavlake <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </p>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}