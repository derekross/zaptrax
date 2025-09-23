import React, { useState, useEffect } from 'react';
import { UnifiedTrackItem } from './UnifiedTrackItem';
import { wavlakeAPI } from '@/lib/wavlake';
import type { WavlakeSearchResult, WavlakeTrack } from '@/lib/wavlake';

interface SearchTrackItemProps {
  result: WavlakeSearchResult;
  index: number;
  onPlay: (result: WavlakeSearchResult) => void;
  onAddToPlaylist?: (track: WavlakeTrack) => void;
}

export function SearchTrackItem({ result, index, onPlay, onAddToPlaylist }: SearchTrackItemProps) {
  const [track, setTrack] = useState<WavlakeTrack | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    async function fetchTrack() {
      try {
        setIsLoading(true);
        const trackData = await wavlakeAPI.getTrack(result.id);
        const data = Array.isArray(trackData) ? trackData[0] : trackData;

        const fullTrack: WavlakeTrack = {
          id: data.id,
          title: data.title || result.name,
          albumTitle: data.albumTitle || result.albumTitle || '',
          artist: data.artist || result.artist || '',
          artistId: data.artistId || result.artistId || '',
          albumId: data.albumId || result.albumId || '',
          artistArtUrl: data.artistArtUrl || result.artistArtUrl || '',
          albumArtUrl: data.albumArtUrl || result.albumArtUrl || '',
          mediaUrl: data.mediaUrl || '',
          duration: data.duration || result.duration || 0,
          releaseDate: data.releaseDate || '',
          msatTotal: data.msatTotal || '',
          artistNpub: data.artistNpub || '',
          order: data.order || 0,
          url: `https://wavlake.com/track/${data.id}`
        };

        setTrack(fullTrack);
        setIsError(false);
      } catch {
        // Fallback to search result data
        const fallbackTrack: WavlakeTrack = {
          id: result.id,
          title: result.name,
          albumTitle: result.albumTitle || '',
          artist: result.artist || '',
          artistId: result.artistId || '',
          albumId: result.albumId || '',
          artistArtUrl: result.artistArtUrl || '',
          albumArtUrl: result.albumArtUrl || '',
          mediaUrl: '',
          duration: result.duration || 0,
          releaseDate: '',
          msatTotal: '',
          artistNpub: '',
          order: 0,
          url: `https://wavlake.com/track/${result.id}`
        };
        setTrack(fallbackTrack);
        setIsError(false);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTrack();
  }, [result]);

  const handleClick = () => {
    onPlay(result);
  };

  return (
    <UnifiedTrackItem
      track={track}
      index={index}
      isLoading={isLoading}
      isError={isError}
      onClick={handleClick}
      onAddToPlaylist={onAddToPlaylist}
      showAlbum={false}
    />
  );
}