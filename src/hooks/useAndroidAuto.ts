import { useEffect, useRef } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';

interface AndroidAutoPlugin {
  updateMetadata(options: {
    title: string;
    artist: string;
    album: string;
    artworkUrl: string;
    duration: number;
  }): Promise<void>;
  updatePlaybackState(options: {
    playing: boolean;
    position: number;
    speed: number;
  }): Promise<void>;
  updateQueue(options: {
    tracks: Array<{
      id: string;
      title: string;
      artist: string;
      album: string;
      artworkUrl: string;
      duration: number;
    }>;
    currentIndex: number;
  }): Promise<void>;
  isAvailable(): Promise<{ available: boolean }>;
}

// Register the plugin
const AndroidAuto = registerPlugin<AndroidAutoPlugin>('AndroidAuto');

/**
 * Hook that integrates the music player with Android Auto.
 * This enables playback control from car head units.
 */
export function useAndroidAuto() {
  const { state, togglePlayPause, nextTrack, previousTrack, seekTo, playTrackByIndex } = useMusicPlayer();
  const lastTrackIdRef = useRef<string | null>(null);
  const lastPlayingRef = useRef<boolean | null>(null);
  const updateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Handle Android Auto commands
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
      return;
    }

    const handleAndroidAutoCommand = (event: CustomEvent<{
      action: string;
      seekTime?: number;
      mediaId?: string;
    }>) => {
      const { action, seekTime, mediaId } = event.detail;
      console.log('[AndroidAuto] Command received:', action, { seekTime, mediaId });

      switch (action) {
        case 'play':
          if (!state.isPlaying) {
            togglePlayPause();
          }
          break;
        case 'pause':
          if (state.isPlaying) {
            togglePlayPause();
          }
          break;
        case 'nexttrack':
          nextTrack();
          break;
        case 'previoustrack':
          previousTrack();
          break;
        case 'seekto':
          if (typeof seekTime === 'number') {
            seekTo(seekTime);
          }
          break;
        case 'playFromMediaId':
          if (mediaId && mediaId.startsWith('queue_')) {
            // Parse queue index from mediaId like "queue_0_trackId"
            const parts = mediaId.split('_');
            if (parts.length >= 2) {
              const index = parseInt(parts[1], 10);
              if (!isNaN(index)) {
                playTrackByIndex(index);
              }
            }
          }
          break;
        case 'stop':
          if (state.isPlaying) {
            togglePlayPause();
          }
          break;
      }
    };

    window.addEventListener('androidAutoCommand', handleAndroidAutoCommand as EventListener);

    return () => {
      window.removeEventListener('androidAutoCommand', handleAndroidAutoCommand as EventListener);
    };
  }, [state.isPlaying, togglePlayPause, nextTrack, previousTrack, seekTo, playTrackByIndex]);

  // Update metadata when track changes
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
      return;
    }

    if (!state.currentTrack) return;

    const trackId = state.currentTrack.id;
    if (lastTrackIdRef.current === trackId) return;
    lastTrackIdRef.current = trackId;

    const updateMetadata = async () => {
      try {
        await AndroidAuto.updateMetadata({
          title: state.currentTrack?.title || 'Unknown Track',
          artist: state.currentTrack?.artist || 'Unknown Artist',
          album: state.currentTrack?.albumTitle || '',
          artworkUrl: state.currentTrack?.albumArtUrl || '',
          duration: state.currentTrack?.duration || Math.floor(state.duration),
        });
        console.log('[AndroidAuto] Metadata updated');
      } catch (error) {
        console.error('[AndroidAuto] Failed to update metadata:', error);
      }
    };

    updateMetadata();
  }, [state.currentTrack, state.duration]);

  // Update playback state when playing/paused
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
      return;
    }

    // Only update if state actually changed
    if (lastPlayingRef.current === state.isPlaying) return;
    lastPlayingRef.current = state.isPlaying;

    const updatePlaybackState = async () => {
      try {
        await AndroidAuto.updatePlaybackState({
          playing: state.isPlaying,
          position: state.currentTime,
          speed: 1.0,
        });
        console.log('[AndroidAuto] Playback state updated:', state.isPlaying);
      } catch (error) {
        console.error('[AndroidAuto] Failed to update playback state:', error);
      }
    };

    updatePlaybackState();
  }, [state.isPlaying, state.currentTime]);

  // Update position periodically during playback
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
      return;
    }

    // Clear existing interval
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }

    if (!state.isPlaying) return;

    const updatePosition = async () => {
      try {
        await AndroidAuto.updatePlaybackState({
          playing: state.isPlaying,
          position: state.currentTime,
          speed: 1.0,
        });
      } catch {
        // Silently fail position updates
      }
    };

    // Update every 5 seconds
    updateIntervalRef.current = setInterval(updatePosition, 5000);

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
    };
  }, [state.isPlaying, state.currentTime]);

  // Update queue when it changes
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
      return;
    }

    if (state.queue.length === 0) return;

    const updateQueue = async () => {
      try {
        const tracks = state.queue.map((track) => ({
          id: track.id,
          title: track.title || 'Unknown Track',
          artist: track.artist || 'Unknown Artist',
          album: track.albumTitle || '',
          artworkUrl: track.albumArtUrl || '',
          duration: track.duration || 0,
        }));

        await AndroidAuto.updateQueue({
          tracks,
          currentIndex: state.currentIndex,
        });
        console.log('[AndroidAuto] Queue updated:', tracks.length, 'tracks');
      } catch (error) {
        console.error('[AndroidAuto] Failed to update queue:', error);
      }
    };

    updateQueue();
  }, [state.queue, state.currentIndex]);
}
