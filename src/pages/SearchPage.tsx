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
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-6 p-4 md:p-6 pb-4 md:pb-6">
        {/* Search Icon */}
        <div className="flex-shrink-0">
          <div className="h-40 w-40 md:h-64 md:w-64 rounded-lg bg-gradient-to-br from-purple-600 via-purple-700 to-purple-900 flex items-center justify-center shadow-2xl">
            <Search className="h-16 w-16 md:h-24 md:w-24 text-white" />
          </div>
        </div>

        {/* Search Info */}
        <div className="flex-1 space-y-4 md:space-y-6 text-center md:text-left md:pt-16">
          <div>
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-3 md:mb-6 text-white">Search</h1>
            <p className="text-sm text-gray-400 mt-4 max-w-lg">
              Discover tracks, artists, albums, and users across the platform. Search for npub addresses or NIP-05 identifiers to find users.
            </p>
          </div>
        </div>
      </div>

      {/* Search Component */}
      <div className="px-4 md:px-6">
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