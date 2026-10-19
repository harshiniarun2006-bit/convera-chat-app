import React from 'react';
import { Settings, UserPlus, Users, Moon, Sun } from 'lucide-react';
import { CherryLogo } from '../common/CherryLogo';
import { useAuth } from '../../context/AuthContext';

interface NavbarProps {
  onOpenNewChat: () => void;
  onOpenNewGroup: () => void;
  onOpenSettings: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenNewChat,
  onOpenNewGroup,
  onOpenSettings
}) => {
  const { userProfile, userSettings, updateSettingsState } = useAuth();

  const toggleTheme = () => {
    const nextTheme = userSettings?.theme === 'dark' ? 'light' : 'dark';
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    updateSettingsState({ theme: nextTheme });
  };

  return (
    <header className="md:hidden bg-white dark:bg-[#1C0F1A] border-b border-[#F7DCE3] dark:border-[#33182A] px-4 py-2.5 flex items-center justify-between select-none shrink-0 z-20">
      <CherryLogo size="sm" showText={true} />

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 text-zinc-500 hover:text-amber-500 rounded-full"
          title="Toggle theme"
        >
          {userSettings?.theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </button>

        <button
          type="button"
          onClick={onOpenNewChat}
          className="p-2 text-zinc-500 hover:text-[#8F1238] rounded-full"
          title="New Chat"
        >
          <UserPlus className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onOpenNewGroup}
          className="p-2 text-zinc-500 hover:text-[#8F1238] rounded-full"
          title="New Group"
        >
          <Users className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
          className="relative ml-1 cursor-pointer"
        >
          <img
            src={userProfile?.avatarUrl || 'https://api.dicebear.com/7.x/shapes/svg?seed=cherry'}
            alt="Profile"
            className="w-8 h-8 rounded-full object-cover border border-[#8F1238]/30"
          />
          <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 border border-white dark:border-[#1C0F1A] rounded-full" />
        </button>
      </div>
    </header>
  );
};
