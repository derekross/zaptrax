import React, { createContext, useContext, useReducer, useRef, useEffect } from 'react';
import type { WavlakeTrack } from '@/lib/wavlake';
import type { UnifiedTrack } from '@/lib/unifiedTrack';
import { wavlakeToUnified } from '@/lib/unifiedTrack';
import { useUpdateNowPlaying } from '@/hooks/useNostrMusic';
import { useCurrentUser } from '@/hooks/useCurrentUser';

interface MusicPlayerState {
  currentTrack: UnifiedTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  queue: UnifiedTrack[];
  currentIndex: number;
  isLoading: boolean;
  error: string | null;
}

type MusicPlayerAction =
  | { type: 'SET_TRACK'; payload: UnifiedTrack }
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'SET_CURRENT_TIME'; payload: number }
  | { type: 'SET_DURATION'; payload: number }
  | { type: 'SET_VOLUME'; payload: number }
  | { type: 'SET_QUEUE'; payload: UnifiedTrack[] }
  | { type: 'SET_CURRENT_INDEX'; payload: number }
  | { type: 'PLAY_TRACK_BY_INDEX'; payload: number }
  | { type: 'NEXT_TRACK' }
  | { type: 'PREVIOUS_TRACK' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_ERROR' };

const initialState: MusicPlayerState = {
  currentTrack: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  queue: [],
  currentIndex: -1,
  isLoading: false,
  error: null,
};

function musicPlayerReducer(state: MusicPlayerState, action: MusicPlayerAction): MusicPlayerState {
  switch (action.type) {
    case 'SET_TRACK':
      return {
        ...state,
        currentTrack: action.payload,
        currentTime: 0,
        error: null,
      };
    case 'PLAY':
      return { ...state, isPlaying: true };
    case 'PAUSE':
      return { ...state, isPlaying: false };
    case 'SET_CURRENT_TIME':
      return { ...state, currentTime: action.payload };
    case 'SET_DURATION':
      return { ...state, duration: action.payload };
    case 'SET_VOLUME':
      return { ...state, volume: action.payload };
    case 'SET_QUEUE':
      return { ...state, queue: action.payload };
    case 'SET_CURRENT_INDEX':
      return { ...state, currentIndex: action.payload };
    case 'PLAY_TRACK_BY_INDEX':
      if (action.payload >= 0 && action.payload < state.queue.length) {
        return {
          ...state,
          currentIndex: action.payload,
          currentTrack: state.queue[action.payload],
          currentTime: 0,
        };
      }
      return state;
    case 'NEXT_TRACK':
      if (state.currentIndex < state.queue.length - 1) {
        const nextIndex = state.currentIndex + 1;
        return {
          ...state,
          currentIndex: nextIndex,
          currentTrack: state.queue[nextIndex],
          currentTime: 0,
        };
      }
      return state;
    case 'PREVIOUS_TRACK':
      if (state.currentIndex > 0) {
        const prevIndex = state.currentIndex - 1;
        return {
          ...state,
          currentIndex: prevIndex,
          currentTrack: state.queue[prevIndex],
          currentTime: 0,
        };
      }
      return state;
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
}

interface MusicPlayerContextType {
  state: MusicPlayerState;
  dispatch: React.Dispatch<MusicPlayerAction>;
  audioRef: React.RefObject<HTMLAudioElement>;
  playTrack: (track: UnifiedTrack | WavlakeTrack, queue?: (UnifiedTrack | WavlakeTrack)[]) => void;
  playTrackByIndex: (index: number) => void;
  togglePlayPause: () => void;
  seekTo: (time: number) => void;
  setVolume: (volume: number) => void;
  nextTrack: () => void;
  previousTrack: () => void;
}

const MusicPlayerContext = createContext<MusicPlayerContextType | undefined>(undefined);

export function MusicPlayerProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(musicPlayerReducer, initialState);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { mutate: updateNowPlaying } = useUpdateNowPlaying();
  const { user } = useCurrentUser();

  const playTrack = (track: UnifiedTrack | WavlakeTrack, queue?: (UnifiedTrack | WavlakeTrack)[]) => {
    // Convert WavlakeTrack to UnifiedTrack if needed
    const unifiedTrack = 'source' in track ? track : wavlakeToUnified(track);
    const unifiedQueue = queue?.map(t => 'source' in t ? t : wavlakeToUnified(t)) || [unifiedTrack];

    console.log('MusicPlayer - playTrack called with:', unifiedTrack);
    console.log('MusicPlayer - track properties:', {
      id: unifiedTrack.id,
      title: unifiedTrack.title,
      albumArtUrl: unifiedTrack.albumArtUrl,
      mediaUrl: unifiedTrack.mediaUrl,
      artist: unifiedTrack.artist,
      source: unifiedTrack.source
    });

    dispatch({ type: 'SET_TRACK', payload: unifiedTrack });

    dispatch({ type: 'SET_QUEUE', payload: unifiedQueue });
    const index = unifiedQueue.findIndex(t => t.id === unifiedTrack.id);
    dispatch({ type: 'SET_CURRENT_INDEX', payload: index });

    dispatch({ type: 'PLAY' }); // Ensure isPlaying state is updated
  };

  const togglePlayPause = () => {
    if (state.currentTrack) {
      if (state.isPlaying) {
        dispatch({ type: 'PAUSE' });
      } else {
        dispatch({ type: 'PLAY' });
      }
    }
  };

  const seekTo = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      dispatch({ type: 'SET_CURRENT_TIME', payload: time });
    }
  };

  const setVolume = (volume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      dispatch({ type: 'SET_VOLUME', payload: volume });
    }
  };

  const nextTrack = () => {
    dispatch({ type: 'NEXT_TRACK' });
  };

  const previousTrack = () => {
    dispatch({ type: 'PREVIOUS_TRACK' });
  };

  const playTrackByIndex = (index: number) => {
    dispatch({ type: 'PLAY_TRACK_BY_INDEX', payload: index });
  };

  // Audio event handlers (keep this useEffect for other event listeners)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadStart = () => {
      console.log('Audio load started');
      dispatch({ type: 'SET_LOADING', payload: true });
    };
    const handleCanPlay = () => {
      console.log('Audio can play');
      dispatch({ type: 'SET_LOADING', payload: false });
      if (state.isPlaying) {
        audio.play().catch((error) => {
          console.error('Audio play failed on canplay:', error);
          if (error.name === 'NotAllowedError') {
            dispatch({ type: 'SET_ERROR', payload: 'Autoplay prevented. Please click play to start.' });
          } else {
            dispatch({ type: 'SET_ERROR', payload: 'Failed to play audio.' });
          }
          dispatch({ type: 'PAUSE' });
        });
      }
    };
    const handleLoadedMetadata = () => {
      console.log('Audio metadata loaded, duration:', audio.duration);
      dispatch({ type: 'SET_DURATION', payload: audio.duration });
    };
    const handleTimeUpdate = () => {
      dispatch({ type: 'SET_CURRENT_TIME', payload: audio.currentTime });
    };
    const handleEnded = () => {
      nextTrack();
    };
    const handleError = () => {
      console.error('Audio error occurred:', audio.error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load audio' });
    };

    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [state.isPlaying]);

  // Update audio source when track changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !state.currentTrack) return;

    let mediaUrl = state.currentTrack.mediaUrl;
    if (!mediaUrl) return; // Ensure mediaUrl is defined

    console.log('MusicPlayer - Original mediaUrl:', mediaUrl);

    // If the mediaUrl contains op3.dev, extract the direct CloudFront URL
    if (mediaUrl.includes('op3.dev')) {
      // Extract the URL after the op3.dev path
      const urlMatch = mediaUrl.match(/https:\/\/op3\.dev\/[^/]+\/(https:\/\/.*)/);
      if (urlMatch) {
        mediaUrl = urlMatch[1];
        console.log('MusicPlayer - Extracted CloudFront URL:', mediaUrl);
      } else {
        console.log('MusicPlayer - Failed to extract URL from op3.dev');
      }
    }

    console.log('MusicPlayer - Setting audio src to:', mediaUrl);
    audio.src = mediaUrl;
    audio.load();

    // Clear any previous error when a new track is set
    dispatch({ type: 'CLEAR_ERROR' });
  }, [state.currentTrack]); // Removed state.isPlaying dependency

  // Handle play/pause based on isPlaying state
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    console.log('MusicPlayer - isPlaying state changed to:', state.isPlaying);

    if (state.isPlaying) {
      console.log('MusicPlayer - Attempting to play audio');
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.error('Audio play failed:', error);
          if (error.name === 'NotAllowedError') {
            dispatch({ type: 'SET_ERROR', payload: 'Autoplay prevented. Please click play to start.' });
          } else {
            dispatch({ type: 'SET_ERROR', payload: 'Failed to play audio.' });
          }
          dispatch({ type: 'PAUSE' });
        });
      }
    } else {
      console.log('MusicPlayer - Pausing audio');
      audio.pause();
    }
  }, [state.isPlaying]);

  // New useEffect to trigger NIP-38 update (keep this useEffect)
  useEffect(() => {
    if (user && state.currentTrack && state.isPlaying) {
      let trackUrl = '';

      // For PodcastIndex, use the direct RSS media URL so it's playable anywhere
      // For Wavlake, use app URL since it requires the app to play
      if (state.currentTrack.source === 'wavlake') {
        const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
        trackUrl = `${baseUrl}/album/${state.currentTrack.albumId}`;
      } else if (state.currentTrack.source === 'podcastindex') {
        // Use direct media URL from RSS - universally playable
        trackUrl = state.currentTrack.mediaUrl;
      }

      // Create a WavlakeTrack-like object for the hook (works for both sources)
      const trackData = {
        id: state.currentTrack.sourceId,
        title: state.currentTrack.title,
        artist: state.currentTrack.artist,
        albumTitle: state.currentTrack.albumTitle,
        albumArtUrl: state.currentTrack.albumArtUrl,
        artistArtUrl: state.currentTrack.artistArtUrl,
        mediaUrl: state.currentTrack.mediaUrl,
        duration: state.currentTrack.duration,
        releaseDate: state.currentTrack.releaseDate,
        artistId: state.currentTrack.artistId || '',
        albumId: state.currentTrack.albumId || '',
        msatTotal: state.currentTrack.msatTotal || '',
        artistNpub: state.currentTrack.artistNpub || '',
        order: state.currentTrack.order || 0,
      };

      updateNowPlaying({ track: trackData, trackUrl });
    }
  }, [user, state.currentTrack, state.isPlaying, updateNowPlaying]);



  const value: MusicPlayerContextType = {
    state,
    dispatch,
    audioRef,
    playTrack,
    playTrackByIndex,
    togglePlayPause,
    seekTo,
    setVolume,
    nextTrack,
    previousTrack,
  };

  return (
    <MusicPlayerContext.Provider value={value}>
      {children}
      <audio ref={audioRef} preload="metadata" />
    </MusicPlayerContext.Provider>
  );
}

export function useMusicPlayer() {
  const context = useContext(MusicPlayerContext);
  if (context === undefined) {
    throw new Error('useMusicPlayer must be used within a MusicPlayerProvider');
  }
  return context;
}