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
import { cn } from '@/lib/utils';

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
    "flex flex-row items-center justify-center flex-1 h-12 px-4 py-0 min-w-0 min-h-0 border-none focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 transition-all font-medium text-sm bg-transparent rounded-none text-gray-400 hover:text-white";
  const tabActive =
    "data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-purple-500";

  return (
    <div className="bg-black min-h-screen">
      <div
        className="w-full bg-black border-b border-gray-800"
        style={{
          position: 'fixed',
          top: '4rem',
          zIndex: 40,
          width: '100%'
        }}
      >
        <Tabs value={getActiveTab()}>
          <TabsList className="flex w-full h-12 bg-black border-none px-6 overflow-hidden rounded-none">
          {user && (
            <TabsTrigger
              value="social"
              className={cn(tabBase, tabActive)}
              asChild
            >
              <Link to="/social" className="flex items-center">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">Social</span>
              </Link>
            </TabsTrigger>
          )}
          <TabsTrigger
            value="discover"
            className={cn(tabBase, tabActive)}
            asChild
          >
            <Link to="/" className="flex items-center">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Home</span>
            </Link>
          </TabsTrigger>
          <TabsTrigger
            value="search"
            className={cn(tabBase, tabActive)}
            asChild
          >
            <Link to="/search" className="flex items-center">
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Search</span>
            </Link>
          </TabsTrigger>
          {user && (
            <>
              <TabsTrigger
                value="playlists"
                className={cn(tabBase, tabActive)}
                asChild
              >
                <Link to="/playlists" className="flex items-center">
                  <PlayCircle className="h-4 w-4" />
                  <span className="hidden sm:inline ml-2">Playlists</span>
                </Link>
              </TabsTrigger>
              <TabsTrigger
                value="liked"
                className={cn(tabBase, tabActive)}
                asChild
              >
                <Link to="/liked" className="flex items-center">
                  <Heart className="h-4 w-4" />
                  <span className="hidden sm:inline ml-2">Liked</span>
                </Link>
              </TabsTrigger>
            </>
          )}
          </TabsList>
        </Tabs>
      </div>

      {/* The content for each tab will be rendered by the Outlet */}
      <div className="bg-black" style={{ marginTop: '7rem' }}>
        <Outlet />
      </div>
    </div>
  );
}