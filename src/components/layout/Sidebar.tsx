import React from 'react';
import {
  MessageSquare,
  Users,
  UserPlus,
  Settings,
  LogOut,
  Moon,
  Sun,
  Download
} from 'lucide-react';
import { CherryLogo } from '../common/CherryLogo';
import { useAuth } from '../../context/AuthContext';
import { usePWAInstall } from '../../services/pwa';

interface SidebarProps {
  activeView: 'chats' | 'contacts';
  onNavigate: (view: 'chats' | 'contacts') => void;
  onOpenNewChat: () => void;
  onOpenNewGroup: () => void;
  onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onNavigate,
  onOpenNewChat,
  onOpenNewGroup,
  onOpenSettings
}) => {
  const { userProfile, signOut, toggleTheme, isDark } = useAuth();
  const { canInstall, installApp } = usePWAInstall();

  return (
    <aside className="w-18 md:w-20 bg-white dark:bg-[#160B14] border-r border-[#F7DCE3] dark:border-[#33182A] flex flex-col items-center justify-between py-5 select-none shrink-0 z-20">
      
      {/* Brand Icon */}
      <div className="flex flex-col items-center gap-6">
        <CherryLogo size="md" showText={false} />

        {/* Primary Navigation Actions */}
        <nav className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('chats')}
            className={`p-3 rounded-2xl transition-all ${
              activeView === 'chats'
                ? 'bg-[#8F1238] text-white shadow-md shadow-[#8F1238]/20 scale-105'
                : 'text-zinc-500 hover:text-[#8F1238] dark:hover:text-[#F7DCE3] hover:bg-[#FCECF0] dark:hover:bg-[#2A1523]'
            }`}
            title="All Messages"
          >
            <MessageSquare className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={onOpenNewChat}
            className="p-3 rounded-2xl text-zinc-500 hover:text-[#8F1238] dark:hover:text-[#F7DCE3] hover:bg-[#FCECF0] dark:hover:bg-[#2A1523] transition-all"
            title="Start New Chat"
          >
            <UserPlus className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={onOpenNewGroup}
            className="p-3 rounded-2xl text-zinc-500 hover:text-[#8F1238] dark:hover:text-[#F7DCE3] hover:bg-[#FCECF0] dark:hover:bg-[#2A1523] transition-all"
            title="Create Group"
          >
            <Users className="w-5 h-5" />
          </button>
        </nav>
      </div>

      {/* Bottom User Actions */}
      <div className="flex flex-col items-center gap-3">
        {/* PWA Install Button */}
        {canInstall && (
          <button
            type="button"
            onClick={installApp}
            className="p-2.5 rounded-full text-[#8F1238] dark:text-[#FFA4B8] bg-[#FCECF0] dark:bg-[#33182A] hover:scale-110 shadow-xs transition-all animate-pulse"
            title="Install Convora App"
          >
            <Download className="w-5 h-5" />
          </button>
        )}

        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2.5 rounded-full text-zinc-500 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-[#FCECF0] dark:hover:bg-[#2A1523] transition-colors"
          title="Toggle Light/Dark Theme"
        >
          {isDark ? (
            <Sun className="w-5 h-5 text-amber-400" />
          ) : (
            <Moon className="w-5 h-5 text-zinc-600" />
          )}
        </button>

        {/* Settings Button */}
        <button
          type="button"
          onClick={onOpenSettings}
          className="p-2.5 rounded-full text-zinc-500 hover:text-[#8F1238] dark:hover:text-[#F7DCE3] hover:bg-[#FCECF0] dark:hover:bg-[#2A1523] transition-colors"
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>

        {/* User Avatar with Presence Dot */}
        <div
          onClick={onOpenSettings}
          className="relative cursor-pointer group mt-2"
          title={`${userProfile?.displayName} (@${userProfile?.username})`}
        >
          <img
            src={userProfile?.avatarUrl || 'https://api.dicebear.com/7.x/shapes/svg?seed=cherry'}
            alt={userProfile?.displayName || 'User'}
            className="w-10 h-10 rounded-full object-cover border-2 border-[#8F1238]/30 group-hover:scale-105 transition-transform"
          />
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-[#160B14] rounded-full shadow-xs" />
        </div>
      </div>

    </aside>
  );
};
