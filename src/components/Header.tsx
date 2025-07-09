import { Link } from 'react-router-dom';
import { Music } from 'lucide-react';
import { LoginArea } from './auth/LoginArea';
import { ThemeToggle } from './ThemeToggle';

export function Header() {
  return (
    <header className="sticky-header w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pt-[env(safe-area-inset-top)]">
      <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0 px-4">
        <div className="flex gap-6 md:gap-10">
          <Link to="/" className="flex items-center space-x-2">
            <div className="p-2 bg-primary rounded-md">
              <Music className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="inline-block font-bold text-lg">ZAPTRAX</span>
          </Link>
        </div>
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
