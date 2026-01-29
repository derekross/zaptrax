import { useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';

// Dynamic import of the media session plugin to avoid issues on web
let MediaSession: typeof import('@jofr/capacitor-media-session').MediaSession | null = null;

// Initialize the plugin only on native platforms
if (Capacitor.isNativePlatform()) {
  import('@jofr/capacitor-media-session').then((module) => {
    MediaSession = module.MediaSession;
  });
}

/**
 * Hook that bridges the Capacitor MediaSession plugin with the music player context.
 * This enables native media controls (lock screen, notification) on Android and iOS.
 */
export function useCapacitorMediaSession() {
  const { state, togglePlayPause, nextTrack, previousTrack, seekTo } = useMusicPlayer();
  const lastTrackIdRef = useRef<string | null>(null);
  const updateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Setup action handlers
  const setupActionHandlers = useCallback(async () => {
    if (!MediaSession) return;

    try {
      await MediaSession.setActionHandler({ action: 'play' }, () => {
        console.log('[MediaSession] Play action received');
        togglePlayPause();
      });

      await MediaSession.setActionHandler({ action: 'pause' }, () => {
        console.log('[MediaSession] Pause action received');
        togglePlayPause();
      });

      await MediaSession.setActionHandler({ action: 'previoustrack' }, () => {
        console.log('[MediaSession] Previous track action received');
        previousTrack();
      });

      await MediaSession.setActionHandler({ action: 'nexttrack' }, () => {
        console.log('[MediaSession] Next track action received');
        nextTrack();
      });

      await MediaSession.setActionHandler({ action: 'seekto' }, (details) => {
        console.log('[MediaSession] Seek action received:', details);
        if (details && typeof details.seekTime === 'number') {
          seekTo(details.seekTime);
        }
      });
    } catch (error) {
      console.error('[MediaSession] Error setting up action handlers:', error);
    }
  }, [togglePlayPause, nextTrack, previousTrack, seekTo]);

  // Update metadata when track changes
  useEffect(() => {
    if (!MediaSession || !state.currentTrack) return;

    const trackId = state.currentTrack.id;

    // Only update metadata if track actually changed
    if (lastTrackIdRef.current === trackId) return;
    lastTrackIdRef.current = trackId;

    const updateMetadata = async () => {
      if (!MediaSession) return;

      try {
        const metadata: {
          title: string;
          artist: string;
          album: string;
          artwork?: Array<{ src: string; sizes: string; type: string }>;
        } = {
          title: state.currentTrack?.title || 'Unknown Track',
          artist: state.currentTrack?.artist || 'Unknown Artist',
          album: state.currentTrack?.albumTitle || '',
        };

        // Add artwork if available
        if (state.currentTrack?.albumArtUrl) {
          metadata.artwork = [
            {
              src: state.currentTrack.albumArtUrl,
              sizes: '512x512',
              type: 'image/jpeg',
            },
          ];
        }

        console.log('[MediaSession] Setting metadata:', metadata);
        await MediaSession.setMetadata(metadata);
      } catch (error) {
        console.error('[MediaSession] Error setting metadata:', error);
      }
    };

    updateMetadata();
  }, [state.currentTrack]);

  // Update playback state when playing/paused
  useEffect(() => {
    if (!MediaSession) return;

    const updatePlaybackState = async () => {
      if (!MediaSession) return;

      try {
        const playbackState = state.isPlaying ? 'playing' : 'paused';
        console.log('[MediaSession] Setting playback state:', playbackState);
        await MediaSession.setPlaybackState({ playbackState });
      } catch (error) {
        console.error('[MediaSession] Error setting playback state:', error);
      }
    };

    updatePlaybackState();
  }, [state.isPlaying]);

  // Update position state periodically during playback
  useEffect(() => {
    if (!MediaSession) return;

    // Clear any existing interval
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }

    const updatePositionState = async () => {
      if (!MediaSession || !state.duration || state.duration <= 0) return;

      try {
        await MediaSession.setPositionState({
          duration: state.duration,
          position: state.currentTime,
          playbackRate: 1,
        });
      } catch {
        // Position state updates can fail silently - don't spam logs
      }
    };

    // Initial update
    updatePositionState();

    // Update every 5 seconds during playback
    if (state.isPlaying) {
      updateIntervalRef.current = setInterval(updatePositionState, 5000);
    }

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
    };
  }, [state.isPlaying, state.currentTime, state.duration]);

  // Initialize action handlers on mount
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    // Wait for plugin to be loaded
    const initTimeout = setTimeout(() => {
      setupActionHandlers();
    }, 500);

    return () => {
      clearTimeout(initTimeout);
    };
  }, [setupActionHandlers]);
}
