import { createRoot } from 'react-dom/client';

// Import polyfills first
import './lib/polyfills.ts';

import App from './App.tsx';
import './index.css';

// Minimal scrollbar setup for sticky positioning
function setupScrollbar() {
  // Only set basic scrollbar visibility
  document.documentElement.style.overflowY = 'scroll';
}

// Initialize minimal scrollbar setup
setupScrollbar();

// Register service worker for PWA with update handling
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);

        // Check for updates every 30 seconds
        setInterval(() => {
          registration.update();
        }, 30000);

        // Handle service worker updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New version available, notify user
                const currentVersion = __APP_VERSION__;
                if (confirm(`A new version of ZapTrax (v${currentVersion}) is available. Refresh to update?`)) {
                  newWorker.postMessage({ action: 'skipWaiting' });
                  window.location.reload();
                }
              }
            });
          }
        });
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });

    // Listen for service worker controlling the page
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // New service worker has taken control, reload to get fresh content
      window.location.reload();
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
