import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Play, Music, User, Disc } from 'lucide-react';
import { useWavlakeSearch } from '@/hooks/useWavlake';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { useUpdateNowPlaying } from '@/hooks/useNostrMusic';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useDebounce } from '@/hooks/useDebounce';
import type { WavlakeSearchResult } from '@/lib/wavlake';

interface MusicSearchProps {
  onTrackSelect?: (result: WavlakeSearchResult) => void;
  onArtistSelect?: (result: WavlakeSearchResult) => void;
  onAlbumSelect?: (result: WavlakeSearchResult) => void;
}

export function MusicSearch({
  onTrackSelect,
  onArtistSelect,
  onAlbumSelect
}: MusicSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const { user } = useCurrentUser();
  const { playTrack } = useMusicPlayer();
  const { mutate: updateNowPlaying } = useUpdateNowPlaying();

  const { data: searchResults, isLoading, error } = useWavlakeSearch(
    debouncedSearchTerm,
    debouncedSearchTerm.length > 2
  );

  const groupedResults = useMemo(() => {
    if (!searchResults) return { tracks: [], artists: [], albums: [] };

    return {
      tracks: searchResults.filter(r => r.type === 'track'),
      artists: searchResults.filter(r => r.type === 'artist'),
      albums: searchResults.filter(r => r.type === 'album'),
    };
  }, [searchResults]);

  const handleTrackPlay = async (result: WavlakeSearchResult) => {
    if (result.type !== 'track') return;

    try {
      // Convert search result to track format for player
      const track = {
        id: result.id,
        title: result.name,
        albumTitle: result.albumTitle || '',
        artist: result.artist || '',
        artistId: result.artistId || '',
        albumId: result.albumId || '',
        artistArtUrl: result.artistArtUrl || '',
        albumArtUrl: result.albumArtUrl || '',
        mediaUrl: `https://wavlake.com/api/v1/content/track/${result.id}/stream`, // Assuming stream endpoint
        duration: result.duration || 0,
        releaseDate: '',
        msatTotal: '0',
        artistNpub: '',
        order: 0,
      };

      playTrack(track);

      if (user) {
        const trackUrl = `https://wavlake.com/track/${result.id}`;
        updateNowPlaying({ track, trackUrl });
      }
    } catch (error) {
      console.error('Failed to play track:', error);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'track':
        return <Music className="h-4 w-4" />;
      case 'artist':
        return <User className="h-4 w-4" />;
      case 'album':
        return <Disc className="h-4 w-4" />;
      default:
        return <Music className="h-4 w-4" />;
    }
  };

  const handleResultClick = (result: WavlakeSearchResult) => {
    switch (result.type) {
      case 'track':
        onTrackSelect?.(result);
        break;
      case 'artist':
        onArtistSelect?.(result);
        break;
      case 'album':
        onAlbumSelect?.(result);
        break;
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search for tracks, artists, or albums..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-3">
                  <Skeleton className="h-12 w-12 rounded-md" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-red-500">
              Failed to search: {error.message}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Search Results */}
      {searchResults && searchResults.length > 0 && (
        <div className="space-y-4">
          {/* Tracks */}
          {groupedResults.tracks.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Music className="h-5 w-5" />
                  <span>Tracks</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {groupedResults.tracks.map((result) => (
                  <div
                    key={result.id}
                    className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer group"
                    onClick={() => handleResultClick(result)}
                  >
                    <Avatar className="h-12 w-12 rounded-md">
                      <AvatarImage src={result.albumArtUrl} alt={result.name} />
                      <AvatarFallback className="rounded-md">
                        {result.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">
                        {result.name}
                      </h4>
                      <p className="text-sm text-muted-foreground truncate">
                        {result.artist}
                      </p>
                      {result.albumTitle && (
                        <p className="text-xs text-muted-foreground truncate">
                          {result.albumTitle}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      {result.duration && (
                        <Badge variant="outline" className="text-xs">
                          {formatDuration(result.duration)}
                        </Badge>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTrackPlay(result);
                        }}
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Artists */}
          {groupedResults.artists.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Artists</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {groupedResults.artists.map((result) => (
                  <div
                    key={result.id}
                    className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => handleResultClick(result)}
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={result.artistArtUrl} alt={result.name} />
                      <AvatarFallback>
                        {result.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">
                        {result.name}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Artist
                      </p>
                    </div>

                    <Badge variant="outline">
                      {getResultIcon(result.type)}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Albums */}
          {groupedResults.albums.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Disc className="h-5 w-5" />
                  <span>Albums</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {groupedResults.albums.map((result) => (
                  <div
                    key={result.id}
                    className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => handleResultClick(result)}
                  >
                    <Avatar className="h-12 w-12 rounded-md">
                      <AvatarImage src={result.albumArtUrl} alt={result.name} />
                      <AvatarFallback className="rounded-md">
                        {result.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">
                        {result.name}
                      </h4>
                      <p className="text-sm text-muted-foreground truncate">
                        {result.artist}
                      </p>
                    </div>

                    <Badge variant="outline">
                      {getResultIcon(result.type)}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* No Results */}
      {searchResults && searchResults.length === 0 && debouncedSearchTerm.length > 2 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Music className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No results found</h3>
            <p className="text-sm text-muted-foreground">
              Try searching with different keywords
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

