import { createRoot } from 'react-dom/client';

// Import polyfills first
import './lib/polyfills.ts';

import App from './App.tsx';
import './index.css';

// Completely prevent scrollbar layout shifts by overriding Radix behavior
function preventScrollbarShift() {
  // Force scrollbar to always be visible on html element
  document.documentElement.style.overflowY = 'scroll';

  let originalScrollY = 0;

  // Override any attempts to modify body overflow
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
        const target = mutation.target as HTMLElement;
        if (target === document.body) {
          const style = target.style;

          // If overflow is being set to hidden (modal opening)
          if (style.overflow === 'hidden' || style.overflowY === 'hidden') {
            // Store current scroll position
            originalScrollY = window.scrollY;

            // Prevent scrolling but keep scrollbar visible
            style.overflow = '';
            style.overflowY = '';
            style.position = 'fixed';
            style.top = `-${originalScrollY}px`;
            style.left = '0';
            style.right = '0';
            style.width = '100%';

            // Ensure html still shows scrollbar
            document.documentElement.style.overflowY = 'scroll';
          }
          // If position is being cleared (modal closing)
          else if (style.position !== 'fixed' && originalScrollY > 0) {
            // Restore scroll position
            style.position = '';
            style.top = '';
            style.left = '';
            style.right = '';
            style.width = '';
            window.scrollTo(0, originalScrollY);
            originalScrollY = 0;
          }
        }
      }
    });
  });

  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['style']
  });

  // Prevent any CSS or JS from hiding the scrollbar
  const styleObserver = new MutationObserver(() => {
    if (document.documentElement.style.overflowY !== 'scroll') {
      document.documentElement.style.overflowY = 'scroll';
    }
  });

  styleObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['style', 'class']
  });

  // Also prevent programmatic changes
  const originalSetProperty = CSSStyleDeclaration.prototype.setProperty;
  CSSStyleDeclaration.prototype.setProperty = function(property, value, priority) {
    if (this === document.documentElement.style && property === 'overflow-y' && value !== 'scroll') {
      return originalSetProperty.call(this, property, 'scroll', priority);
    }
    return originalSetProperty.call(this, property, value, priority);
  };
}

// Initialize scrollbar shift prevention immediately
preventScrollbarShift();

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
