import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
    <div className="min-h-screen bg-black text-white">
      {/* Header Section */}
      <div className="flex items-start gap-6 p-6 pb-8">
        {/* Search Icon */}
        <div className="flex-shrink-0">
          <div className="h-64 w-64 rounded-lg bg-gradient-to-br from-purple-600 via-purple-700 to-purple-900 flex items-center justify-center shadow-2xl">
            <Search className="h-24 w-24 text-white" />
          </div>
        </div>

        {/* Search Info */}
        <div className="flex-1 space-y-6 pt-16">
          <div>
            <h1 className="text-6xl font-bold mb-6 text-white">Search</h1>
            <div className="flex items-center gap-2 text-gray-300">
              <span className="text-white font-medium">Discovery</span>
              <span>•</span>
              <span>Music & Users</span>
              <span>•</span>
              <span>2025</span>
            </div>
            <p className="text-sm text-gray-400 mt-4 max-w-lg">
              Discover tracks, artists, albums, and users across the platform. Search for npub addresses or NIP-05 identifiers to find users.
            </p>
          </div>
        </div>
      </div>

      {/* Search Component */}
      <div className="px-6">
        <MusicSearch
          onArtistSelect={handleArtistSelect}
          onAlbumSelect={handleAlbumSelect}
          onUserSelect={handleUserSelect}
          onAddToPlaylist={handleAddToPlaylist}
        />
      </div>

      {/* Add to Playlist Dialog */}
      <AddToPlaylistDialog
        open={addToPlaylistOpen}
        onOpenChange={setAddToPlaylistOpen}
        track={selectedTrackForPlaylist}
      />
    </div>
  );
}