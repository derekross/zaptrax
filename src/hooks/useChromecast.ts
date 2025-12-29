import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';

// Only import on native platforms
let Chromecast: {
  initialize: (options?: { appId?: string }) => Promise<void>;
  requestSession: () => Promise<void>;
  launchMedia: (options: { mediaUrl: string }) => Promise<void>;
  castPlay: () => Promise<void>;
  castPause: () => Promise<void>;
  castStop: () => Promise<void>;
  endSession: () => Promise<void>;
  addListener: (event: string, callback: (data: unknown) => void) => Promise<{ remove: () => void }>;
} | null = null;

if (Capacitor.isNativePlatform()) {
  import('@gameleap/capacitor-chromecast').then((module) => {
    Chromecast = module.Chromecast;
  }).catch((e) => {
    console.warn('Failed to load Chromecast plugin:', e);
  });
}

interface ChromecastState {
  isAvailable: boolean;
  isConnected: boolean;
  isCasting: boolean;
  error: string | null;
}

export function useChromecast() {
  const [state, setState] = useState<ChromecastState>({
    isAvailable: false,
    isConnected: false,
    isCasting: false,
    error: null,
  });
  const [initialized, setInitialized] = useState(false);

  // Initialize Chromecast
  useEffect(() => {
    async function init() {
      if (!Capacitor.isNativePlatform()) {
        return;
      }

      // Wait for dynamic import to complete
      await new Promise((resolve) => setTimeout(resolve, 500));

      if (!Chromecast) {
        console.warn('Chromecast plugin not available');
        return;
      }

      try {
        await Chromecast.initialize();
        setState((prev) => ({ ...prev, isAvailable: true }));
        setInitialized(true);
        console.log('Chromecast initialized');
      } catch (error) {
        console.error('Failed to initialize Chromecast:', error);
        setState((prev) => ({
          ...prev,
          isAvailable: false,
          error: 'Failed to initialize Chromecast',
        }));
      }
    }

    init();
  }, []);

  // Request a Chromecast session (show device picker)
  const requestSession = useCallback(async () => {
    console.log('[Chromecast] requestSession called, initialized:', initialized);
    if (!Chromecast || !initialized) {
      console.log('[Chromecast] requestSession: not available');
      setState((prev) => ({ ...prev, error: 'Chromecast not available' }));
      return false;
    }

    try {
      console.log('[Chromecast] calling Chromecast.requestSession()...');
      await Chromecast.requestSession();
      console.log('[Chromecast] requestSession resolved successfully');
      setState((prev) => ({ ...prev, isConnected: true, error: null }));
      return true;
    } catch (error) {
      console.error('[Chromecast] requestSession failed:', error);
      setState((prev) => ({
        ...prev,
        isConnected: false,
        error: 'Failed to connect to Chromecast',
      }));
      return false;
    }
  }, [initialized]);

  // Cast media to connected device
  const castMedia = useCallback(
    async (mediaUrl: string) => {
      console.log('[Chromecast] castMedia called with URL:', mediaUrl);
      if (!Chromecast) {
        console.log('[Chromecast] castMedia: Chromecast not available');
        setState((prev) => ({ ...prev, error: 'Chromecast not available' }));
        return false;
      }

      if (!state.isConnected) {
        console.log('[Chromecast] castMedia: not connected, requesting session...');
        // If not connected, try to request session first
        const connected = await requestSession();
        console.log('[Chromecast] castMedia: requestSession returned:', connected);
        if (!connected) {
          console.log('[Chromecast] castMedia: failed to connect, aborting');
          return false;
        }
      }

      try {
        console.log('[Chromecast] castMedia: calling launchMedia...');
        await Chromecast.launchMedia({ mediaUrl });
        console.log('[Chromecast] castMedia: launchMedia succeeded!');
        setState((prev) => ({ ...prev, isCasting: true, isConnected: true, error: null }));
        return true;
      } catch (error) {
        console.error('[Chromecast] castMedia: launchMedia failed:', error);
        setState((prev) => ({
          ...prev,
          isCasting: false,
          error: 'Failed to cast media',
        }));
        return false;
      }
    },
    [state.isConnected, requestSession]
  );

  // Play media on Chromecast
  const castPlay = useCallback(async () => {
    if (!Chromecast || !state.isCasting) return;
    try {
      await Chromecast.castPlay();
      console.log('[Chromecast] castPlay succeeded');
    } catch (error) {
      console.error('[Chromecast] castPlay failed:', error);
    }
  }, [state.isCasting]);

  // Pause media on Chromecast
  const castPause = useCallback(async () => {
    if (!Chromecast || !state.isCasting) return;
    try {
      await Chromecast.castPause();
      console.log('[Chromecast] castPause succeeded');
    } catch (error) {
      console.error('[Chromecast] castPause failed:', error);
    }
  }, [state.isCasting]);

  // Stop casting and end session
  const stopCasting = useCallback(async () => {
    if (!Chromecast) {
      setState((prev) => ({ ...prev, isCasting: false, isConnected: false }));
      return;
    }
    try {
      await Chromecast.castStop();
      await Chromecast.endSession();
      console.log('[Chromecast] stopCasting succeeded');
    } catch (error) {
      console.error('[Chromecast] stopCasting failed:', error);
    }
    setState((prev) => ({ ...prev, isCasting: false, isConnected: false }));
  }, []);

  return {
    ...state,
    requestSession,
    castMedia,
    castPlay,
    castPause,
    stopCasting,
    isNative: Capacitor.isNativePlatform(),
  };
}
