import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";

import { MusicHome } from "./pages/MusicHome";
import { ArtistPage } from "./pages/ArtistPage";
import { AlbumPage } from "./pages/AlbumPage";
import { SearchPage } from "./pages/SearchPage";
import { PlaylistPage } from "./pages/PlaylistPage";
import { MusicPlayer } from "./components/music/MusicPlayer";
import NotFound from "./pages/NotFound";
import { Layout } from "./components/Layout";
import { MusicPlaylists } from "./components/music/MusicPlaylists";
import { MusicLikedSongs } from "./components/music/MusicLikedSongs";
import { PlayerPortal } from './components/PlayerPortal';
import { Header } from "./components/Header";

export function AppRouter() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Header />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<MusicHome />} />
          <Route path="music" element={<MusicHome />} />
          <Route path="music/search" element={<SearchPage />} />
          <Route path="music/playlists" element={<MusicPlaylists />} />
          <Route path="music/liked" element={<MusicLikedSongs />} />
          <Route path="playlist/:nip19Id" element={<PlaylistPage />} />
          <Route path="artist/:artistId" element={<ArtistPage />} />
          <Route path="album/:albumId" element={<AlbumPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      <PlayerPortal>
        <MusicPlayer />
      </PlayerPortal>
      <footer className="py-6 px-2 sm:px-4 md:px-8 md:py-0">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            Music from{' '}
            <a
              href="https://wavlake.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline underline-offset-4"
            >
              Wavlake
            </a>
          </p>
        </div>
      </footer>
    </BrowserRouter>
  );
}
export default AppRouter;