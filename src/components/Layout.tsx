import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  TrendingUp,
  Search,
  Heart,
  PlayCircle,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Header } from '@/components/Header';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export function Layout() {
  const { user } = useCurrentUser();
  const location = useLocation();

  // Determine the active tab based on the current path
  const getActiveTab = () => {
    if (location.pathname.startsWith('/music/search')) return 'search';
    if (location.pathname.startsWith('/music/playlists')) return 'playlists';
    if (location.pathname.startsWith('/music/liked')) return 'liked';
    return 'discover'; // Default for /music or /
  };

  return (
    <>
      <Header />
      <div className="container mx-auto px-4 py-8 space-y-8">
        <Tabs value={getActiveTab()} className="space-y-8">
          <TabsList className="sticky top-0 z-30 grid w-full grid-cols-4 bg-card border-2 border-primary punk-card">
            <TabsTrigger
              value="discover"
              className="flex items-center space-x-2 font-bold uppercase tracking-wide data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              asChild
            >
              <Link to="/music">
                <TrendingUp className="h-4 w-4" />
                <span>DISCOVER</span>
              </Link>
            </TabsTrigger>
            <TabsTrigger
              value="search"
              className="flex items-center space-x-2 font-bold uppercase tracking-wide data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              asChild
            >
              <Link to="/music/search">
                <Search className="h-4 w-4" />
                <span>SEARCH</span>
              </Link>
            </TabsTrigger>
            {user && (
              <>
                <TabsTrigger
                  value="playlists"
                  className="flex items-center space-x-2 font-bold uppercase tracking-wide data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  asChild
                >
                  <Link to="/music/playlists">
                    <PlayCircle className="h-4 w-4" />
                    <span>PLAYLISTS</span>
                  </Link>
                </TabsTrigger>
                <TabsTrigger
                  value="liked"
                  className="flex items-center space-x-2 font-bold uppercase tracking-wide data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  asChild
                >
                  <Link to="/music/liked">
                    <Heart className="h-4 w-4" />
                    <span>LIKED</span>
                  </Link>
                </TabsTrigger>
              </>
            )}
          </TabsList>
          {/* The content for each tab will be rendered by the Outlet */}
          <Outlet />
        </Tabs>
      </div>
    </>
  );
}
