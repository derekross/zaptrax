import React, { useState, useEffect } from 'react';
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
import { Zap, ExternalLink, Wallet, Globe } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { useWebLN } from '@/hooks/useWebLN';
import { wavlakeAPI } from '@/lib/wavlake';
import {
  fetchLNURLPayInfo,
  requestLNURLPayInvoice,
  fetchLightningAddressInfo,
  isLightningAddress,
  isKeysendRecipient,
  calculateSplits
} from '@/lib/lnurl';
import { parseRSSEpisodeValueBlock } from '@/lib/rssParser';
import type { WavlakeTrack } from '@/lib/wavlake';
import type { UnifiedTrack } from '@/lib/unifiedTrack';
import type { ValueRecipient, ValueBlock } from '@/lib/podcastindex';

interface ZapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  track: WavlakeTrack | UnifiedTrack | null;
  rssValueBlock?: ValueBlock | null;
}

const WAVLAKE_APP_ID = 'DR25'; // Wavlake app ID

export function ZapDialog({ open, onOpenChange, track, rssValueBlock: passedRssValueBlock }: ZapDialogProps) {
  const [amount, setAmount] = useState('1000');
  const [comment, setComment] = useState('Zapped from ZapTrax!');
  const [isLoading, setIsLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'webln' | 'external'>('webln');
  const [fetchedRssValueBlock, setFetchedRssValueBlock] = useState<ValueBlock | null>(null);
  const [_loadingValueBlock, setLoadingValueBlock] = useState(false);
  const { toast } = useToast();
  const webln = useWebLN();

  // Use passed RSS value block or fetch our own
  const rssValueBlock = passedRssValueBlock || fetchedRssValueBlock;

  // Auto-detect payment method based on WebLN availability
  useEffect(() => {
    if (webln.isAvailable) {
      setPaymentMethod('webln');
    } else {
      setPaymentMethod('external');
    }
  }, [webln.isAvailable]);

  // Fetch RSS value block for PodcastIndex tracks (only if not passed from parent)
  useEffect(() => {
    async function fetchValueBlock() {
      // Skip if we already have a value block passed from parent
      if (passedRssValueBlock) {
        return;
      }

      if (!track || !isUnifiedTrack(track) || track.source !== 'podcastindex') {
        setFetchedRssValueBlock(null);
        return;
      }

      // Skip if we already have value block data
      if (track.value?.recipients && track.value.recipients.length > 0) {
        setFetchedRssValueBlock(track.value);
        return;
      }

      // Try to fetch from RSS feed
      if (!track.feedUrl || !track.episodeGuid) {
        setFetchedRssValueBlock(null);
        return;
      }

      setLoadingValueBlock(true);
      try {
        const valueBlock = await parseRSSEpisodeValueBlock(track.feedUrl, track.episodeGuid);
        setFetchedRssValueBlock(valueBlock);
      } catch (error) {
        console.error('Failed to parse RSS value block:', error);
        setFetchedRssValueBlock(null);
      } finally {
        setLoadingValueBlock(false);
      }
    }

    if (open) {
      fetchValueBlock();
    }
  }, [open, track, passedRssValueBlock]);

  // Check if this is a UnifiedTrack with podcast value data
  const isUnifiedTrack = (t: WavlakeTrack | UnifiedTrack): t is UnifiedTrack => {
    return 'source' in t;
  };

  // Helper to handle keysend payment to a single recipient
  const sendKeysend = async (recipient: ValueRecipient, amountSats: number) => {
    if (!webln.keysend) {
      throw new Error('Keysend not supported by WebLN provider');
    }

    // Build custom records for podcast:valueTimeSplit
    const customRecords: Record<string, string> = {};
    if (recipient.customKey && recipient.customValue) {
      customRecords[recipient.customKey] = recipient.customValue;
    }

    // Send keysend payment
    return await webln.keysend(recipient.address, amountSats, customRecords);
  };

  // Handle podcast value4value payments (keysend + lightning address)
  const handlePodcastValue4ValuePayment = async (valueBlock: ValueBlock) => {
    if (!track || !isUnifiedTrack(track)) {
      throw new Error('Invalid track data');
    }

    const amountSats = parseInt(amount);
    const recipients = valueBlock.recipients || [];

    if (recipients.length === 0) {
      throw new Error('No payment recipients configured');
    }

    // Calculate splits
    const splits = calculateSplits(amountSats, recipients);
    const payments: Promise<unknown>[] = [];

    // Process each recipient
    for (const [recipient, recipientAmount] of splits.entries()) {
      if (isKeysendRecipient(recipient)) {
        // Keysend payment
        if (paymentMethod === 'webln') {
          payments.push(sendKeysend(recipient, recipientAmount));
        } else {
          // External wallet - can't do keysend, so skip
          console.warn('Keysend not supported for external wallet', recipient);
        }
      } else if (isLightningAddress(recipient)) {
        // Lightning address payment
        const lnurlPayInfo = await fetchLightningAddressInfo(recipient.address);
        const amountMsats = recipientAmount * 1000;

        // Check amount limits
        if (amountMsats < lnurlPayInfo.minSendable || amountMsats > lnurlPayInfo.maxSendable) {
          console.warn(`Amount ${recipientAmount} sats out of range for ${recipient.address}`);
          continue;
        }

        // Request invoice
        const invoiceResponse = await requestLNURLPayInvoice(
          lnurlPayInfo.callback,
          amountMsats,
          comment || undefined
        );

        // Pay invoice
        if (paymentMethod === 'webln') {
          payments.push(webln.sendPayment(invoiceResponse.pr));
        } else {
          // For external wallet, open first invoice only
          if (payments.length === 0) {
            window.open(`lightning:${invoiceResponse.pr}`, '_blank');
          }
        }
      }
    }

    // Wait for all payments to complete (WebLN only)
    if (paymentMethod === 'webln' && payments.length > 0) {
      await Promise.all(payments);
    }
  };

  const handleZapWithWebLN = async () => {
    if (!track) return;

    try {
      // Check if this track has RSS feed value block (works for both PodcastIndex and Wavlake RSS feeds)
      if (isUnifiedTrack(track) && (track.feedUrl || rssValueBlock)) {
        // Use RSS-parsed value block or track's value block
        const valueBlock = rssValueBlock || track.value;

        if (!valueBlock || !valueBlock.recipients || valueBlock.recipients.length === 0) {
          throw new Error('This track does not have payment information configured. Cannot send zap.');
        }

        await handlePodcastValue4ValuePayment(valueBlock);
        toast({
          title: "Zap successful! ⚡",
          description: `Successfully zapped ${amount} sats to "${track.title}"`,
        });
        onOpenChange(false);
        return;
      }

      // Wavlake API track (no RSS feed) - use Wavlake LNURL flow
      // Extract the actual track ID (remove source prefix if present)
      const trackId = isUnifiedTrack(track) && track.source === 'wavlake'
        ? track.sourceId
        : track.id;

      const lnurlResponse = await wavlakeAPI.getLnurl(trackId, WAVLAKE_APP_ID);

      if (!lnurlResponse.lnurl) {
        throw new Error('No LNURL in response from Wavlake');
      }

      const lnurlPayInfo = await fetchLNURLPayInfo(lnurlResponse.lnurl);
      const amountMsats = parseInt(amount) * 1000;

      if (amountMsats < lnurlPayInfo.minSendable || amountMsats > lnurlPayInfo.maxSendable) {
        throw new Error(`Amount must be between ${lnurlPayInfo.minSendable / 1000} and ${lnurlPayInfo.maxSendable / 1000} sats`);
      }

      const invoiceResponse = await requestLNURLPayInvoice(
        lnurlPayInfo.callback,
        amountMsats,
        comment || undefined
      );

      await webln.sendPayment(invoiceResponse.pr);

      toast({
        title: "Zap successful! ⚡",
        description: `Successfully zapped ${amount} sats to "${track.title}"`,
      });

      onOpenChange(false);
    } catch (error) {
      console.error('WebLN zap failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`WebLN payment failed: ${errorMessage}`);
    }
  };

  const handleZapExternal = async () => {
    if (!track) return;

    try {
      // Check if this track has RSS feed value block (works for both PodcastIndex and Wavlake RSS feeds)
      if (isUnifiedTrack(track) && (track.feedUrl || rssValueBlock)) {
        // Use RSS-parsed value block or track's value block
        const valueBlock = rssValueBlock || track.value;

        if (!valueBlock || !valueBlock.recipients || valueBlock.recipients.length === 0) {
          throw new Error('This track does not have payment information configured. Cannot send zap.');
        }

        await handlePodcastValue4ValuePayment(valueBlock);
        toast({
          title: "Zap initiated",
          description: `Opening lightning wallet to zap ${amount} sats to "${track.title}"`,
        });
        onOpenChange(false);
        return;
      }

      // Wavlake API track (no RSS feed) - use Wavlake LNURL flow
      // Extract the actual track ID (remove source prefix if present)
      const trackId = isUnifiedTrack(track) && track.source === 'wavlake'
        ? track.sourceId
        : track.id;

      const lnurlResponse = await wavlakeAPI.getLnurl(trackId, WAVLAKE_APP_ID);

      if (!lnurlResponse.lnurl) {
        throw new Error('No LNURL in response from Wavlake');
      }

      const lnurlPayInfo = await fetchLNURLPayInfo(lnurlResponse.lnurl);
      const amountMsats = parseInt(amount) * 1000;

      if (amountMsats < lnurlPayInfo.minSendable || amountMsats > lnurlPayInfo.maxSendable) {
        throw new Error(`Amount must be between ${lnurlPayInfo.minSendable / 1000} and ${lnurlPayInfo.maxSendable / 1000} sats`);
      }

      const invoiceResponse = await requestLNURLPayInvoice(
        lnurlPayInfo.callback,
        amountMsats,
        comment || undefined
      );

      window.open(`lightning:${invoiceResponse.pr}`, '_blank');

      toast({
        title: "Zap initiated",
        description: `Opening lightning wallet to zap ${amount} sats to "${track.title}"`,
      });

      onOpenChange(false);
    } catch (error) {
      console.error('External zap failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to open external wallet: ${errorMessage}`);
    }
  };

  const handleZap = async () => {
    if (!track) return;

    setIsLoading(true);
    try {
      if (paymentMethod === 'webln' && webln.isAvailable) {
        await handleZapWithWebLN();
      } else {
        await handleZapExternal();
      }
    } catch (error) {
      console.error('Zap failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: "Zap failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setAmount('1000');
    setComment('Zapped from ZapTrax!');
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
        <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg overflow-hidden">
          <Avatar className="h-12 w-12 rounded-md flex-shrink-0">
            <AvatarImage src={track.albumArtUrl} alt={track.albumTitle} />
            <AvatarFallback className="rounded-md">
              {track.title.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 overflow-hidden">
            <h4 className="font-medium text-sm truncate break-all">
              {track.title}
            </h4>
            <p className="text-sm text-muted-foreground truncate break-all">
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
          {/* Payment Method Selection */}
          {webln.isAvailable && (
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <div className="flex space-x-2">
                <Button
                  type="button"
                  size="sm"
                  variant={paymentMethod === 'webln' ? 'default' : 'outline'}
                  onClick={() => setPaymentMethod('webln')}
                  className="flex-1 flex items-center justify-center space-x-2"
                >
                  <Wallet className="h-4 w-4" />
                  <span>WebLN Wallet</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={paymentMethod === 'external' ? 'default' : 'outline'}
                  onClick={() => setPaymentMethod('external')}
                  className="flex-1 flex items-center justify-center space-x-2"
                >
                  <Globe className="h-4 w-4" />
                  <span>External Wallet</span>
                </Button>
              </div>
              {paymentMethod === 'webln' && !webln.isEnabled && (
                <p className="text-xs text-muted-foreground">
                  WebLN wallet will be automatically enabled when you zap
                </p>
              )}
            </div>
          )}

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
              {isLoading ? (
                paymentMethod === 'webln' ? 'Paying with WebLN...' : 'Opening Wallet...'
              ) : (
                `⚡ Zap ${formatSats(amount)} sats`
              )}
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