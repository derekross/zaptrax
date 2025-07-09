import React from 'react';
import { Button } from '@/components/ui/button';
import { Moon, Sun, Skull } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="punk-button border-2 border-primary"
        >
          {theme === 'light' && <Sun className="h-4 w-4" />}
          {theme === 'dark' && <Moon className="h-4 w-4" />}
          {theme === 'system' && <Skull className="h-4 w-4" />}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="punk-card border-2 border-primary bg-card"
      >
        <DropdownMenuItem 
          onClick={() => setTheme('light')}
          className="font-bold uppercase tracking-wide"
        >
          <Sun className="mr-2 h-4 w-4" />
          Light Punk
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme('dark')}
          className="font-bold uppercase tracking-wide"
        >
          <Moon className="mr-2 h-4 w-4" />
          Dark Punk
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme('system')}
          className="font-bold uppercase tracking-wide"
        >
          <Skull className="mr-2 h-4 w-4" />
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}