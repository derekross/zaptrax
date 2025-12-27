import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App, URLOpenListenerEvent } from '@capacitor/app';

/**
 * Hook that handles deep links from Capacitor App plugin.
 * This enables the app to open when users click links to zaptrax.app
 */
export function useCapacitorDeepLinks() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handleAppUrlOpen = (event: URLOpenListenerEvent) => {
      console.log('[DeepLink] URL opened:', event.url);

      try {
        const url = new URL(event.url);

        // Only handle zaptrax.app URLs
        if (url.hostname === 'zaptrax.app') {
          // Navigate to the path from the URL
          const path = url.pathname + url.search + url.hash;
          console.log('[DeepLink] Navigating to:', path);
          navigate(path);
        }
      } catch (error) {
        console.error('[DeepLink] Error handling URL:', error);
      }
    };

    // Listen for app URL open events
    App.addListener('appUrlOpen', handleAppUrlOpen);

    // Check if app was opened with a URL (cold start)
    App.getLaunchUrl().then((result) => {
      if (result?.url) {
        console.log('[DeepLink] App launched with URL:', result.url);
        handleAppUrlOpen({ url: result.url });
      }
    });

    return () => {
      App.removeAllListeners();
    };
  }, [navigate]);
}
