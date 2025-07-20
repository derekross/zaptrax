import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  TrendingUp,
  Search,
  Heart,
  PlayCircle,
  Users,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export function Layout() {
  const { user } = useCurrentUser();
  const location = useLocation();

  // Determine the active tab based on the current path
  const getActiveTab = () => {
    if (location.pathname.startsWith('/social')) return 'social';
    if (location.pathname.startsWith('/search')) return 'search';
    if (location.pathname.startsWith('/playlists')) return 'playlists';
    if (location.pathname.startsWith('/liked')) return 'liked';
    return 'discover'; // Default for /
  };



  const tabBase =
    "flex flex-row items-center justify-center flex-1 h-12 px-0 py-0 min-w-0 min-h-0 border-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all font-bold uppercase tracking-wide text-xs sm:text-base bg-transparent rounded-none";
  const tabActive =
    "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=active]:border-primary data-[state=active]:border-b-4 data-[state=active]:rounded-none";

  return (
    <div className="min-h-screen">
      <div className="sticky top-16 z-40 w-full">
        <Tabs value={getActiveTab()}>
          <TabsList className="flex w-full h-12 bg-card border-2 border-primary punk-card px-0 overflow-hidden rounded-b-lg">
          {user && (
            <TabsTrigger
              value="social"
              className={`${tabBase} ${tabActive}`}
              asChild
            >
              <Link to="/social">
                <Users className="h-6 w-6 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline ml-2">SOCIAL</span>
              </Link>
            </TabsTrigger>
          )}
          <TabsTrigger
            value="discover"
            className={`${tabBase} ${tabActive}`}
            asChild
          >
            <Link to="/">
              <TrendingUp className="h-6 w-6 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline ml-2">DISCOVER</span>
            </Link>
          </TabsTrigger>
          <TabsTrigger
            value="search"
            className={`${tabBase} ${tabActive}`}
            asChild
          >
            <Link to="/search">
              <Search className="h-6 w-6 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline ml-2">SEARCH</span>
            </Link>
          </TabsTrigger>
          {user && (
            <>
              <TabsTrigger
                value="playlists"
                className={`${tabBase} ${tabActive}`}
                asChild
              >
                <Link to="/playlists">
                  <PlayCircle className="h-6 w-6 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline ml-2">PLAYLISTS</span>
                </Link>
              </TabsTrigger>
              <TabsTrigger
                value="liked"
                className={`${tabBase} ${tabActive}`}
                asChild
              >
                <Link to="/liked">
                  <Heart className="h-6 w-6 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline ml-2">LIKED</span>
                </Link>
              </TabsTrigger>
            </>
          )}
          </TabsList>
        </Tabs>
      </div>

      {/* The content for each tab will be rendered by the Outlet */}
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-8 pb-32">
        <Outlet />
      </div>
    </div>
  );
}
