import { useCapacitorMediaSession } from '@/hooks/useCapacitorMediaSession';

/**
 * Bridge component that connects the Capacitor MediaSession plugin
 * to the music player context. This enables native media controls
 * (lock screen, notification) on Android and iOS.
 *
 * This component must be rendered inside MusicPlayerProvider.
 */
export function CapacitorMediaSessionBridge() {
  useCapacitorMediaSession();
  return null;
}
