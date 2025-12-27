import React from 'react';
import { Link } from 'react-router-dom';
import { Music } from 'lucide-react';
import { LoginArea } from './auth/LoginArea';

export function Header() {

  return (
    <header
      className="w-full bg-black border-b border-gray-800"
      style={{
        position: 'fixed',
        top: 0,
        zIndex: 50,
        width: '100%',
        paddingTop: 'env(safe-area-inset-top, 0px)'
      }}
    >
      <div className="container flex h-16 items-center justify-between px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2">
          <div className="p-2 bg-purple-600 rounded-md">
            <Music className="h-6 w-6 text-white" />
          </div>
          <span className="inline-block font-bold text-lg text-white">ZapTrax</span>
        </Link>

        {/* Right Side */}
        <nav className="flex items-center space-x-1">
          <LoginArea />
        </nav>
      </div>
    </header>
  );
}