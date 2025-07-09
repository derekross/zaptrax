import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";

import { MusicHome } from "./pages/MusicHome";
import { ArtistPage } from "./pages/ArtistPage";
import { MusicPlayer } from "./components/music/MusicPlayer";
import NotFound from "./pages/NotFound";
import { Layout } from "./components/Layout";
import { MusicSearch } from "./components/music/MusicSearch";
import { MusicPlaylists } from "./components/music/MusicPlaylists";
import { MusicLikedSongs } from "./components/music/MusicLikedSongs";

export function AppRouter() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <div className="min-h-screen pb-24">
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<MusicHome />} />
            <Route path="music" element={<MusicHome />} />
            <Route path="music/search" element={<MusicSearch />} />
            <Route path="music/playlists" element={<MusicPlaylists />} />
            <Route path="music/liked" element={<MusicLikedSongs />} />
            <Route path="artist/:artistId" element={<ArtistPage />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </div>
      <MusicPlayer />
      <footer className="py-6 md:px-8 md:py-0">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            VIBED WITH{' '}
            <a
              href="https://soapbox.pub/mkstack"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline underline-offset-4"
            >
              MKSTACK
            </a>
            {' '}⚡ PUNK ROCK FOREVER ⚡
          </p>
        </div>
      </footer>
    </BrowserRouter>
  );
}
export default AppRouter;