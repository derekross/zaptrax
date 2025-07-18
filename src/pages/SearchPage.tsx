import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Search } from 'lucide-react';
import { MusicSearch } from '@/components/music/MusicSearch';
import { AddToPlaylistDialog } from '@/components/music/AddToPlaylistDialog';
import type { WavlakeSearchResult, WavlakeTrack } from '@/lib/wavlake';
import type { NostrSearchResult } from '@/lib/nostrSearch';

export function SearchPage() {
  const navigate = useNavigate();
  const [addToPlaylistOpen, setAddToPlaylistOpen] = useState(false);
  const [selectedTrackForPlaylist, setSelectedTrackForPlaylist] = useState<WavlakeTrack | null>(null);

  const handleArtistSelect = (result: WavlakeSearchResult) => {
    if (result.type === 'artist') {
      navigate(`/artist/${result.id}`);
    }
  };

  const handleAlbumSelect = (result: WavlakeSearchResult) => {
    if (result.type === 'album') {
      navigate(`/album/${result.id}`);
    }
  };

  const handleUserSelect = (result: NostrSearchResult) => {
    // Navigation is handled in the MusicSearch component
    console.log('User selected:', result);
  };

  const handleAddToPlaylist = (track: WavlakeTrack) => {
    setSelectedTrackForPlaylist(track);
    setAddToPlaylistOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <Card className="bg-gradient-to-r from-green-500/10 to-teal-500/10 border-green-200 dark:border-green-800">
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            {/* Search Icon */}
            <div className="h-32 w-32 rounded-lg bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center shadow-lg">
              <Search className="h-16 w-16 text-white" />
            </div>

            {/* Search Info */}
            <div className="flex-1 space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Discovery
                </p>
                <h1 className="text-3xl font-bold mt-1">Search</h1>
                <p className="text-muted-foreground mt-2">
                  Discover tracks, artists, albums, and users across the platform
                </p>
              </div>

              {/* Search Tips */}
              <div className="text-sm text-muted-foreground">
                <p>💡 <strong>Pro tip:</strong> Search for npub addresses or NIP-05 identifiers to find users</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search Component */}
      <MusicSearch
        onArtistSelect={handleArtistSelect}
        onAlbumSelect={handleAlbumSelect}
        onUserSelect={handleUserSelect}
        onAddToPlaylist={handleAddToPlaylist}
      />

      {/* Add to Playlist Dialog */}
      <AddToPlaylistDialog
        open={addToPlaylistOpen}
        onOpenChange={setAddToPlaylistOpen}
        track={selectedTrackForPlaylist}
      />
    </div>
  );
}