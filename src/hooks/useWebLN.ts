import { useState, useEffect } from 'react';

// WebLN types
interface WebLNProvider {
  enable(): Promise<void>;
  getInfo(): Promise<{
    node: {
      alias: string;
      pubkey: string;
    };
  }>;
  sendPayment(paymentRequest: string): Promise<{
    preimage: string;
  }>;
  makeInvoice(args: {
    amount?: number;
    defaultMemo?: string;
  }): Promise<{
    paymentRequest: string;
  }>;
  signMessage(message: string): Promise<{
    message: string;
    signature: string;
  }>;
  verifyMessage(signature: string, message: string): Promise<void>;
}

declare global {
  interface Window {
    webln?: WebLNProvider;
  }
}

interface WebLNState {
  isAvailable: boolean;
  isEnabled: boolean;
  isLoading: boolean;
  error: string | null;
  provider: WebLNProvider | null;
}

export function useWebLN() {
  const [state, setState] = useState<WebLNState>({
    isAvailable: false,
    isEnabled: false,
    isLoading: false,
    error: null,
    provider: null,
  });

  useEffect(() => {
    // Check if WebLN is available
    const isAvailable = typeof window !== 'undefined' && !!window.webln;
    setState(prev => ({
      ...prev,
      isAvailable,
      provider: isAvailable ? window.webln! : null,
    }));
  }, []);

  const enable = async () => {
    if (!state.provider) {
      throw new Error('WebLN not available');
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      await state.provider.enable();
      setState(prev => ({ ...prev, isEnabled: true, isLoading: false }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to enable WebLN';
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage,
        isEnabled: false 
      }));
      throw error;
    }
  };

  const sendPayment = async (paymentRequest: string) => {
    if (!state.provider) {
      throw new Error('WebLN not available');
    }

    // Try to enable WebLN if not already enabled
    if (!state.isEnabled) {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      try {
        await state.provider.enable();
        setState(prev => ({ ...prev, isEnabled: true, isLoading: false }));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to enable WebLN';
        setState(prev => ({
          ...prev,
          error: errorMessage,
          isEnabled: false,
          isLoading: false
        }));
        throw new Error(`WebLN not enabled: ${errorMessage}`);
      }
    }

    try {
      const result = await state.provider.sendPayment(paymentRequest);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Payment failed';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  };

  const getInfo = async () => {
    if (!state.provider) {
      throw new Error('WebLN not available');
    }

    // Try to enable WebLN if not already enabled
    if (!state.isEnabled) {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      try {
        await state.provider.enable();
        setState(prev => ({ ...prev, isEnabled: true, isLoading: false }));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to enable WebLN';
        setState(prev => ({
          ...prev,
          error: errorMessage,
          isEnabled: false,
          isLoading: false
        }));
        throw new Error(`WebLN not enabled: ${errorMessage}`);
      }
    }

    try {
      const info = await state.provider.getInfo();
      return info;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get wallet info';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  };

  return {
    ...state,
    enable,
    sendPayment,
    getInfo,
  };
}