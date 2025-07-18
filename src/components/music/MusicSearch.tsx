import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, Music, User, Disc, CheckCircle, XCircle, AtSign, MoreHorizontal, Plus, Play } from 'lucide-react';
import { useWavlakeSearch } from '@/hooks/useWavlake';
import { useNostrSearch } from '@/hooks/useNostrSearch';
import { useAuthor } from '@/hooks/useAuthor';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { wavlakeAPI } from '@/lib/wavlake';
import { useDebounce } from '@/hooks/useDebounce';
import { createNpub, isNpub, isNip05 } from '@/lib/nostrSearch';
import { genUserName } from '@/lib/genUserName';
import type { WavlakeSearchResult, WavlakeTrack } from '@/lib/wavlake';
import type { NostrSearchResult } from '@/lib/nostrSearch';

// Extended interfaces for API responses that might have additional properties
interface ExtendedWavlakeTrack extends WavlakeTrack {
  name?: string;
  url?: string;
}

interface ExtendedWavlakeSearchResult extends WavlakeSearchResult {
  url?: string;
}

interface MusicSearchProps {
  onTrackSelect?: (result: WavlakeSearchResult) => void;
  onArtistSelect?: (result: WavlakeSearchResult) => void;
  onAlbumSelect?: (result: WavlakeSearchResult) => void;
  onUserSelect?: (result: NostrSearchResult) => void;
  onAddToPlaylist?: (track: WavlakeTrack) => void;
}

export function MusicSearch({
  onTrackSelect,
  onArtistSelect,
  onAlbumSelect,
  onUserSelect,
  onAddToPlaylist
}: MusicSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const { playTrack, dispatch } = useMusicPlayer();
  const { user } = useCurrentUser();
  const navigate = useNavigate();

  // Check if search term looks like Nostr identifier
  const isNostrSearch = isNpub(debouncedSearchTerm) || isNip05(debouncedSearchTerm);

  const { data: searchResults, isLoading: musicLoading, error: musicError } = useWavlakeSearch(
    debouncedSearchTerm,
    debouncedSearchTerm.length > 2 && !isNostrSearch
  );

  const { data: nostrResults, isLoading: nostrLoading, error: nostrError } = useNostrSearch(
    debouncedSearchTerm,
    debouncedSearchTerm.length > 2 && isNostrSearch
  );

  const isLoading = musicLoading || nostrLoading;
  const error = musicError || nostrError;

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
      dispatch({ type: 'SET_LOADING', payload: true });
      console.log('MusicSearch - Fetching full track for:', result);
      const trackData = await wavlakeAPI.getTrack(result.id);
      const fullTrack = Array.isArray(trackData) ? trackData[0] : trackData;
      console.log('MusicSearch - Full track data:', fullTrack);
      console.log('MusicSearch - Full track properties:', {
        id: fullTrack.id,
        title: fullTrack.title,
        albumArtUrl: fullTrack.albumArtUrl,
        mediaUrl: fullTrack.mediaUrl,
        artist: fullTrack.artist
      });

      // Normalize the track data to ensure it has all required properties
      const normalizedTrack: WavlakeTrack = {
        id: fullTrack.id,
        title: fullTrack.title || (fullTrack as ExtendedWavlakeTrack).name || result.name,
        albumTitle: fullTrack.albumTitle || result.albumTitle || '',
        artist: fullTrack.artist || result.artist || '',
        artistId: fullTrack.artistId || result.artistId || '',
        albumId: fullTrack.albumId || result.albumId || '',
        artistArtUrl: fullTrack.artistArtUrl || result.artistArtUrl || '',
        albumArtUrl: fullTrack.albumArtUrl || result.albumArtUrl || '',
        mediaUrl: fullTrack.mediaUrl || '',
        duration: fullTrack.duration || result.duration || 0,
        releaseDate: fullTrack.releaseDate || '',
        msatTotal: fullTrack.msatTotal || '',
        artistNpub: fullTrack.artistNpub || '',
        order: fullTrack.order || 0,
        url: (fullTrack as ExtendedWavlakeTrack).url || (result as ExtendedWavlakeSearchResult).url || `https://wavlake.com/track/${fullTrack.id}`
      };

      console.log('MusicSearch - Normalized track:', normalizedTrack);

      // Get all track results to create a queue for navigation
      const trackResults = groupedResults.tracks;
      const trackQueue = await Promise.all(
        trackResults.map(async (trackResult) => {
          if (trackResult.id === result.id) {
            return normalizedTrack; // Use the normalized track
          }
          try {
            const trackData = await wavlakeAPI.getTrack(trackResult.id);
            const track = Array.isArray(trackData) ? trackData[0] : trackData;
            // Normalize each track in the queue as well
            return {
              id: track.id,
              title: track.title || (track as ExtendedWavlakeTrack).name || trackResult.name,
              albumTitle: track.albumTitle || trackResult.albumTitle || '',
              artist: track.artist || trackResult.artist || '',
              artistId: track.artistId || trackResult.artistId || '',
              albumId: track.albumId || trackResult.albumId || '',
              artistArtUrl: track.artistArtUrl || trackResult.artistArtUrl || '',
              albumArtUrl: track.albumArtUrl || trackResult.albumArtUrl || '',
              mediaUrl: track.mediaUrl || '',
              duration: track.duration || trackResult.duration || 0,
              releaseDate: track.releaseDate || '',
              msatTotal: track.msatTotal || '',
              artistNpub: track.artistNpub || '',
              order: track.order || 0,
              url: (track as ExtendedWavlakeTrack).url || (trackResult as ExtendedWavlakeSearchResult).url || `https://wavlake.com/track/${track.id}`
            } as WavlakeTrack;
          } catch (e) {
            console.error('Failed to fetch track:', trackResult.id, e);
            return null;
          }
        })
      );

      // Filter out any failed fetches and play with queue
      const validTracks = trackQueue.filter(track => track !== null) as WavlakeTrack[];
      console.log('MusicSearch - Queue created with', validTracks.length, 'tracks');
      playTrack(normalizedTrack, validTracks);
    } catch (e) {
      console.error('Failed to fetch full track details:', e);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load track details.' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
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

  const handleUserClick = (result: NostrSearchResult) => {
    if (result.pubkey) {
      const npub = createNpub(result.pubkey);
      if (npub) {
        navigate(`/profile/${npub}`);
      }
    }
    onUserSelect?.(result);
  };

  // Component for displaying user search results
  function UserSearchResult({ result }: { result: NostrSearchResult }) {
    const author = useAuthor(result.pubkey || undefined);
    const metadata = author.data?.metadata;
    const displayName = metadata?.display_name || metadata?.name || genUserName(result.pubkey || '');

    return (
      <div
        className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
        onClick={() => handleUserClick(result)}
      >
        <Avatar className="h-12 w-12">
          <AvatarImage src={metadata?.picture} alt={displayName} />
          <AvatarFallback>
            {displayName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h4 className="font-medium text-sm truncate">
              {displayName}
            </h4>
            {result.type === 'nip05' && (
              <div className="flex items-center">
                {result.verified ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
              </div>
            )}
          </div>
          <p className="text-sm text-muted-foreground truncate">
            {result.type === 'nip05' ? result.identifier : 'Nostr User'}
          </p>
          {metadata?.about && (
            <p className="text-xs text-muted-foreground truncate mt-1">
              {metadata.about}
            </p>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-xs">
            {result.type === 'nip05' ? (
              <AtSign className="h-3 w-3 mr-1" />
            ) : (
              <User className="h-3 w-3 mr-1" />
            )}
            {result.type === 'nip05' ? 'NIP-05' : 'npub'}
          </Badge>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search for tracks, artists, albums, or users (npub/NIP-05)..."
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

      {/* Nostr User Results */}
      {nostrResults && nostrResults.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Users</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {nostrResults.map((result, index) => (
              <UserSearchResult key={`${result.identifier}-${index}`} result={result} />
            ))}
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
                    className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 group"
                  >
                    <Avatar className="h-12 w-12 rounded-md">
                      <AvatarImage src={result.albumArtUrl} alt={result.name} />
                      <AvatarFallback className="rounded-md">
                        {result.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>

                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => handleTrackPlay(result)}
                    >
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

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleTrackPlay(result)}>
                            <Play className="h-4 w-4 mr-2" />
                            Play
                          </DropdownMenuItem>
                          {user && onAddToPlaylist && (
                            <DropdownMenuItem
                              onClick={async () => {
                                try {
                                  const trackData = await wavlakeAPI.getTrack(result.id);
                                  const fullTrack = Array.isArray(trackData) ? trackData[0] : trackData;

                                  const normalizedTrack: WavlakeTrack = {
                                    id: fullTrack.id,
                                    title: fullTrack.title || result.name,
                                    albumTitle: fullTrack.albumTitle || result.albumTitle || '',
                                    artist: fullTrack.artist || result.artist || '',
                                    artistId: fullTrack.artistId || result.artistId || '',
                                    albumId: fullTrack.albumId || result.albumId || '',
                                    artistArtUrl: fullTrack.artistArtUrl || result.artistArtUrl || '',
                                    albumArtUrl: fullTrack.albumArtUrl || result.albumArtUrl || '',
                                    mediaUrl: fullTrack.mediaUrl || '',
                                    duration: fullTrack.duration || result.duration || 0,
                                    releaseDate: fullTrack.releaseDate || '',
                                    msatTotal: fullTrack.msatTotal || '',
                                    artistNpub: fullTrack.artistNpub || '',
                                    order: fullTrack.order || 0,
                                    url: fullTrack.url || `https://wavlake.com/track/${fullTrack.id}`
                                  };

                                  onAddToPlaylist(normalizedTrack);
                                } catch (e) {
                                  console.error('Failed to fetch track for playlist:', e);
                                }
                              }}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add to Playlist
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => window.open(`https://wavlake.com/track/${result.id}`, '_blank')}>
                            <Music className="h-4 w-4 mr-2" />
                            View on Wavlake
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
      {debouncedSearchTerm.length > 2 &&
       ((searchResults && searchResults.length === 0) ||
        (nostrResults && nostrResults.length === 0)) &&
       !isLoading && (
        <Card>
          <CardContent className="p-8 text-center">
            {isNostrSearch ? (
              <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            ) : (
              <Music className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            )}
            <h3 className="font-medium mb-2">No results found</h3>
            <p className="text-sm text-muted-foreground">
              {isNostrSearch
                ? 'User not found or NIP-05 address could not be resolved'
                : 'Try searching with different keywords, or search for users with npub/NIP-05 addresses'
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

