import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Music } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { LoginArea } from './auth/LoginArea';
import { ThemeToggle } from './ThemeToggle';

export function Header() {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header
      className="w-full bg-black border-b border-gray-800"
      style={{
        position: 'fixed',
        top: 0,
        zIndex: 50,
        width: '100%'
      }}
    >
      <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0 px-6">
        {/* Logo */}
        <div className="flex gap-6 md:gap-10">
          <Link to="/" className="flex items-center space-x-2">
            <div className="p-2 bg-purple-600 rounded-md">
              <Music className="h-6 w-6 text-white" />
            </div>
            <span className="inline-block font-bold text-lg text-white">ZapTrax</span>
          </Link>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-md mx-8">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search songs, albums, artists, podcasts"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-900 border-gray-700 text-white placeholder-gray-400 focus:border-purple-500 focus:ring-purple-500"
            />
          </form>
        </div>

        {/* Right Side */}
        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="flex items-center space-x-1">
            <ThemeToggle />
            <LoginArea />
          </nav>
        </div>
      </div>
    </header>
  );
}