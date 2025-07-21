import { Link } from 'react-router-dom';
import { Music } from 'lucide-react';
import { LoginArea } from './auth/LoginArea';
import { ThemeToggle } from './ThemeToggle';

export function Header() {
  return (
    <header
      className="w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      style={{
        position: 'fixed',
        top: 0,
        zIndex: 50,
        width: '100%'
      }}
    >
      <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0 px-4">
        <div className="flex gap-6 md:gap-10">
          <Link to="/" className="flex items-center space-x-2">
            <img
              src="/zaptrax.png"
              alt="ZapTrax"
              className="h-8 w-8 object-contain"
              onError={(e) => {
                // Fallback to icon if image fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <div className="hidden p-2 bg-primary rounded-md">
              <Music className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="inline-block font-bold text-lg">ZapTrax</span>
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
