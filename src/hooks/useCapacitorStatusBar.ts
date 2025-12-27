import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

export function useCapacitorStatusBar() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const setupStatusBar = async () => {
      try {
        // Set status bar style to light content (white icons) for dark background
        await StatusBar.setStyle({ style: Style.Dark });

        // Set status bar background color to black
        await StatusBar.setBackgroundColor({ color: '#000000' });

        // Make status bar overlay the WebView (edge-to-edge)
        await StatusBar.setOverlaysWebView({ overlay: false });
      } catch (error) {
        console.error('Failed to configure status bar:', error);
      }
    };

    setupStatusBar();
  }, []);
}
