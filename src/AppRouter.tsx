import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";

import { MusicHome } from "./pages/MusicHome";
import { MusicPlayer } from "./components/music/MusicPlayer";
import NotFound from "./pages/NotFound";

export function AppRouter() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <div className="min-h-screen pb-24">
        <Routes>
          <Route path="/" element={<MusicHome />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
      <MusicPlayer />
    </BrowserRouter>
  );
}
export default AppRouter;