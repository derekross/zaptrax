// NOTE: This file is stable and usually should not be modified.
// It is important that all functionality in this file is preserved, and should only be modified if explicitly requested.

import { ChevronDown, LogOut, UserIcon, UserPlus, User, Sun, Moon, Monitor } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar.tsx';
import { RelaySelector } from '@/components/RelaySelector';
import { useLoggedInAccounts, type Account } from '@/hooks/useLoggedInAccounts';
import { genUserName } from '@/lib/genUserName';
import { nip19 } from 'nostr-tools';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';

interface AccountSwitcherProps {
  onAddAccountClick: () => void;
}

export function AccountSwitcher({ onAddAccountClick }: AccountSwitcherProps) {
  const { currentUser, otherUsers, setLogin, removeLogin } = useLoggedInAccounts();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  if (!currentUser) return null;

  const getDisplayName = (account: Account): string => {
    return account.metadata.name ?? genUserName(account.pubkey);
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button className='flex items-center gap-3 p-3 rounded-full hover:bg-accent transition-all w-full text-foreground'>
          <Avatar className='w-10 h-10'>
            <AvatarImage src={currentUser.metadata.picture} alt={getDisplayName(currentUser)} />
            <AvatarFallback>{getDisplayName(currentUser).charAt(0)}</AvatarFallback>
          </Avatar>
          <div className='flex-1 text-left hidden md:block truncate'>
            <p className='font-medium text-sm truncate'>{getDisplayName(currentUser)}</p>
          </div>
          <ChevronDown className='w-4 h-4 text-muted-foreground' />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className='w-56 p-2 animate-scale-in max-w-[calc(100vw-32px)] bg-black border-gray-800'
        align="end"
        side="bottom"
        sideOffset={4}
        avoidCollisions={true}
        collisionPadding={16}
      >
        <div className='font-medium text-sm px-2 py-1.5'>Switch Relay</div>
        <RelaySelector className="w-full" />
        <DropdownMenuSeparator />
        <div className='font-medium text-sm px-2 py-1.5'>Switch Account</div>
        {otherUsers.map((user) => (
          <DropdownMenuItem
            key={user.id}
            onClick={() => setLogin(user.id)}
            className='flex items-center gap-2 cursor-pointer p-2 rounded-md hover:bg-purple-900/20 hover:text-purple-400'
          >
            <Avatar className='w-8 h-8'>
              <AvatarImage src={user.metadata.picture} alt={getDisplayName(user)} />
              <AvatarFallback>{getDisplayName(user)?.charAt(0) || <UserIcon />}</AvatarFallback>
            </Avatar>
            <div className='flex-1 truncate'>
              <p className='text-sm font-medium'>{getDisplayName(user)}</p>
            </div>
            {user.id === currentUser.id && <div className='w-2 h-2 rounded-full bg-primary'></div>}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => navigate(`/profile/${nip19.npubEncode(currentUser.pubkey)}`)}
          className='flex items-center gap-2 cursor-pointer p-2 rounded-md hover:bg-purple-900/20 hover:text-purple-400'
        >
          <User className='w-4 h-4' />
          <span>View Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onAddAccountClick}
          className='flex items-center gap-2 cursor-pointer p-2 rounded-md hover:bg-purple-900/20 hover:text-purple-400'
        >
          <UserPlus className='w-4 h-4' />
          <span>Add another account</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => removeLogin(currentUser.id)}
          className='flex items-center gap-2 cursor-pointer p-2 rounded-md text-red-500'
        >
          <LogOut className='w-4 h-4' />
          <span>Log out</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <div className='font-medium text-sm px-2 py-1.5'>Theme</div>
        <DropdownMenuItem
          onClick={() => setTheme('light')}
          className='flex items-center gap-2 cursor-pointer p-2 rounded-md hover:bg-purple-900/20 hover:text-purple-400'
        >
          <Sun className='w-4 h-4' />
          <span>Light</span>
          {theme === 'light' && <div className='w-2 h-2 rounded-full bg-purple-500 ml-auto'></div>}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme('dark')}
          className='flex items-center gap-2 cursor-pointer p-2 rounded-md hover:bg-purple-900/20 hover:text-purple-400'
        >
          <Moon className='w-4 h-4' />
          <span>Dark</span>
          {theme === 'dark' && <div className='w-2 h-2 rounded-full bg-purple-500 ml-auto'></div>}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme('system')}
          className='flex items-center gap-2 cursor-pointer p-2 rounded-md hover:bg-purple-900/20 hover:text-purple-400'
        >
          <Monitor className='w-4 h-4' />
          <span>System</span>
          {theme === 'system' && <div className='w-2 h-2 rounded-full bg-purple-500 ml-auto'></div>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}