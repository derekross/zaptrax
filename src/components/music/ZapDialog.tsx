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
import { fetchLNURLPayInfo, requestLNURLPayInvoice } from '@/lib/lnurl';
import type { WavlakeTrack } from '@/lib/wavlake';

interface ZapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  track: WavlakeTrack | null;
}

const WAVLAKE_APP_ID = 'DR25'; // Wavlake app ID

export function ZapDialog({ open, onOpenChange, track }: ZapDialogProps) {
  const [amount, setAmount] = useState('1000');
  const [comment, setComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'webln' | 'external'>('webln');
  const { toast } = useToast();
  const webln = useWebLN();

  // Auto-detect payment method based on WebLN availability
  useEffect(() => {
    if (webln.isAvailable) {
      setPaymentMethod('webln');
    } else {
      setPaymentMethod('external');
    }
  }, [webln.isAvailable]);

  const handleZapWithWebLN = async () => {
    if (!track) return;

    try {
      // Get LNURL for the track
      const lnurlResponse = await wavlakeAPI.getLnurl(track.id, WAVLAKE_APP_ID);

      // Check if the response contains a valid LNURL
      if (!lnurlResponse.lnurl) {
        throw new Error('No LNURL in response from Wavlake');
      }

      // Fetch LNURL-pay info
      const lnurlPayInfo = await fetchLNURLPayInfo(lnurlResponse.lnurl);

      // Convert sats to millisats
      const amountMsats = parseInt(amount) * 1000;

      // Check amount limits
      if (amountMsats < lnurlPayInfo.minSendable || amountMsats > lnurlPayInfo.maxSendable) {
        throw new Error(`Amount must be between ${lnurlPayInfo.minSendable / 1000} and ${lnurlPayInfo.maxSendable / 1000} sats`);
      }

      // Request invoice from LNURL callback
      const invoiceResponse = await requestLNURLPayInvoice(
        lnurlPayInfo.callback,
        amountMsats,
        comment || undefined
      );

      // Pay the invoice using WebLN
      const paymentResult = await webln.sendPayment(invoiceResponse.pr);

      toast({
        title: "Zap successful! ⚡",
        description: `Successfully zapped ${amount} sats to "${track.title}"`,
      });

      onOpenChange(false);
      return paymentResult;
    } catch (error) {
      console.error('WebLN zap failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`WebLN payment failed: ${errorMessage}`);
    }
  };

  const handleZapExternal = async () => {
    if (!track) return;

    try {
      // Get LNURL for the track
      const lnurlResponse = await wavlakeAPI.getLnurl(track.id, WAVLAKE_APP_ID);

      // Check if the response contains a valid LNURL
      if (!lnurlResponse.lnurl) {
        throw new Error('No LNURL in response from Wavlake');
      }

      // Fetch LNURL-pay info
      const lnurlPayInfo = await fetchLNURLPayInfo(lnurlResponse.lnurl);

      // Convert sats to millisats
      const amountMsats = parseInt(amount) * 1000;

      // Check amount limits
      if (amountMsats < lnurlPayInfo.minSendable || amountMsats > lnurlPayInfo.maxSendable) {
        throw new Error(`Amount must be between ${lnurlPayInfo.minSendable / 1000} and ${lnurlPayInfo.maxSendable / 1000} sats`);
      }

      // Request invoice from LNURL callback
      const invoiceResponse = await requestLNURLPayInvoice(
        lnurlPayInfo.callback,
        amountMsats,
        comment || undefined
      );

      // Open the invoice (not the LNURL) in external wallet
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