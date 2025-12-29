import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";
import { useCapacitorDeepLinks } from "./hooks/useCapacitorDeepLinks";
import { PullToRefresh } from "./components/PullToRefresh";

import { MusicHome } from "./pages/MusicHome";
import { ArtistPage } from "./pages/ArtistPage";
import { AlbumPage } from "./pages/AlbumPage";
import { PodcastIndexFeedPage } from "./pages/PodcastIndexFeedPage";
import { SearchPage } from "./pages/SearchPage";
import { SocialFeedPage } from "./pages/SocialFeedPage";
import { PlaylistPage } from "./pages/PlaylistPage";
import { ProfilePage } from "./pages/ProfilePage";
import { NostrTrackPage } from "./pages/NostrTrackPage";
import { NostrPlaylistPage } from "./pages/NostrPlaylistPage";
import { MusicPlayer } from "./components/music/MusicPlayer";
import NotFound from "./pages/NotFound";
import { PrivacyPolicy } from "./pages/PrivacyPolicy";
import { Layout } from "./components/Layout";
import { MusicPlaylists } from "./components/music/MusicPlaylists";
import { MusicLikedSongs } from "./components/music/MusicLikedSongs";
import { PlayerPortal } from './components/PlayerPortal';
import { Header } from "./components/Header";

function CapacitorDeepLinkHandler() {
  useCapacitorDeepLinks();
  return null;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <CapacitorDeepLinkHandler />
      <div className="min-h-screen flex flex-col bg-black">
        <ScrollToTop />
        <Header />
        <PullToRefresh>
          <div className="flex-1 bg-black" style={{ paddingTop: 'calc(4rem + env(safe-area-inset-top, 0px))' }}>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<MusicHome />} />
                <Route path="social" element={<SocialFeedPage />} />
                <Route path="search" element={<SearchPage />} />
                <Route path="playlists" element={<MusicPlaylists />} />
                <Route path="liked" element={<MusicLikedSongs />} />
                <Route path="playlist/:nip19Id" element={<PlaylistPage />} />
                <Route path="nostr-playlist/:naddr" element={<NostrPlaylistPage />} />
                <Route path="profile/:npub" element={<ProfilePage />} />
                <Route path="artist/:artistId" element={<ArtistPage />} />
                <Route path="album/:albumId" element={<AlbumPage />} />
                <Route path="track/:naddr" element={<NostrTrackPage />} />
                <Route path="feed/:feedId" element={<PodcastIndexFeedPage />} />
                <Route path="privacy" element={<PrivacyPolicy />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </div>
        </PullToRefresh>
        <PlayerPortal>
          <MusicPlayer />
        </PlayerPortal>
      </div>
    </BrowserRouter>
  );
}
export default AppRouter;