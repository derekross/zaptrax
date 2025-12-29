import { useCapacitorMediaSession } from '@/hooks/useCapacitorMediaSession';
import { useAndroidAuto } from '@/hooks/useAndroidAuto';

/**
 * Bridge component that connects the Capacitor MediaSession plugin
 * to the music player context. This enables native media controls
 * (lock screen, notification) on Android and iOS.
 *
 * Also integrates with Android Auto for in-car playback control.
 *
 * This component must be rendered inside MusicPlayerProvider.
 */
export function CapacitorMediaSessionBridge() {
  useCapacitorMediaSession();
  useAndroidAuto();
  return null;
}
