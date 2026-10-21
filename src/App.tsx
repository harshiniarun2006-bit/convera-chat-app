/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthModal } from './components/auth/AuthModal';
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { ConversationList } from './components/chat/ConversationList';
import { ChatArea } from './components/chat/ChatArea';
import { NewChatModal } from './components/modals/NewChatModal';
import { NewGroupModal } from './components/modals/NewGroupModal';
import { SettingsModal } from './components/modals/SettingsModal';
import { CherryLogo } from './components/common/CherryLogo';
import { MessageSquare, UserPlus, Users, Sparkles, Shield, Wifi, Download } from 'lucide-react';
import { usePWAInstall } from './services/pwa';

function ChatDashboard() {
  const { currentUser, userProfile, loading } = useAuth();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeView, setActiveView] = useState<'chats' | 'contacts'>('chats');
  const { canInstall, installApp } = usePWAInstall();

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#FFF3F5] via-[#FFF9F7] to-[#FCECF0] dark:from-[#170C15] dark:via-[#21131D] dark:to-[#120810]">
        <div className="flex flex-col items-center gap-4 animate-pulse-subtle">
          <CherryLogo size="xl" showText={true} />
          <div className="flex items-center gap-2 mt-4 text-xs font-semibold text-[#8F1238] dark:text-[#E04D71]">
            <span className="w-2 h-2 rounded-full bg-[#C52B50] animate-ping" />
            Connecting to Convera network...
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser || !userProfile) {
    return <AuthModal />;
  }

  return (
    <div className="h-screen w-screen flex flex-col md:flex-row bg-[#FFF9F7] dark:bg-[#160B14] overflow-hidden select-none">
      
      {/* Mobile Top Navbar */}
      <Navbar
        onOpenNewChat={() => setShowNewChat(true)}
        onOpenNewGroup={() => setShowNewGroup(true)}
        onOpenSettings={() => setShowSettings(true)}
      />

      {/* Desktop Left Navigation Strip */}
      <div className="hidden md:flex">
        <Sidebar
          activeView={activeView}
          onNavigate={(v) => setActiveView(v)}
          onOpenNewChat={() => setShowNewChat(true)}
          onOpenNewGroup={() => setShowNewGroup(true)}
          onOpenSettings={() => setShowSettings(true)}
        />
      </div>

      {/* Main App Workspace */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Conversation List Panel */}
        <div
          className={`w-full md:w-80 lg:w-96 shrink-0 h-full ${
            selectedConversationId ? 'hidden md:block' : 'block'
          }`}
        >
          <ConversationList
            selectedConversationId={selectedConversationId}
            onSelectConversation={(id) => setSelectedConversationId(id)}
            onOpenNewChat={() => setShowNewChat(true)}
            onOpenNewGroup={() => setShowNewGroup(true)}
          />
        </div>

        {/* Chat Area or Desktop Placeholder */}
        <div
          className={`flex-1 h-full min-w-0 ${
            !selectedConversationId ? 'hidden md:flex' : 'flex'
          }`}
        >
          {selectedConversationId ? (
            <ChatArea
              conversationId={selectedConversationId}
              onBackMobile={() => setSelectedConversationId(null)}
            />
          ) : (
            /* Desktop Empty Welcome View */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#FFF3F5] dark:bg-[#190D17] relative overflow-hidden">
              {/* Background ambient accents */}
              <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-[#C52B50]/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#8F1238]/10 rounded-full blur-3xl pointer-events-none" />

              <div className="max-w-md flex flex-col items-center z-10">
                <CherryLogo size="xl" showText={false} className="mb-4" />
                <h2 className="text-3xl font-extrabold text-[#5C102A] dark:text-[#F7DCE3] tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  Convera
                </h2>
                <p className="text-sm font-semibold text-[#8F1238] dark:text-[#E04D71] mt-1 mb-3">
                  Your people, your place.
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mb-6">
                  Select a chat from the left or start a new conversation to begin real-time messaging, photos, files, and voice recordings across any network.
                </p>

                {/* Quick Action Badges */}
                <div className="flex flex-wrap justify-center gap-3 mb-8">
                  <button
                    type="button"
                    onClick={() => setShowNewChat(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white dark:bg-[#2A1624] text-xs font-bold text-[#8F1238] dark:text-[#F7DCE3] border border-[#F7DCE3] dark:border-[#422137] shadow-sm hover:scale-105 active:scale-95 transition-all"
                  >
                    <UserPlus className="w-4 h-4" />
                    New Direct Chat
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewGroup(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white dark:bg-[#2A1624] text-xs font-bold text-[#8F1238] dark:text-[#F7DCE3] border border-[#F7DCE3] dark:border-[#422137] shadow-sm hover:scale-105 active:scale-95 transition-all"
                  >
                    <Users className="w-4 h-4" />
                    Create Group
                  </button>
                  {canInstall && (
                    <button
                      type="button"
                      onClick={installApp}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#FF4B72] to-[#8F1238] text-xs font-bold text-white shadow-md shadow-[#8F1238]/20 hover:scale-105 active:scale-95 transition-all"
                    >
                      <Download className="w-4 h-4" />
                      Install Convera App
                    </button>
                  )}
                </div>

                {/* Network & Security Highlights */}
                <div className="grid grid-cols-2 gap-3 w-full max-w-sm text-left">
                  <div className="p-3 rounded-2xl bg-white/70 dark:bg-[#251321] border border-[#F7DCE3]/60 dark:border-[#381B2D]">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1">
                      <Wifi className="w-3.5 h-3.5 text-[#8F1238] dark:text-[#E04D71]" />
                      Cross-Network
                    </div>
                    <p className="text-[11px] text-zinc-500 leading-tight">
                      Works across independent Wi-Fi, 4G/5G, and devices.
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-white/70 dark:bg-[#251321] border border-[#F7DCE3]/60 dark:border-[#381B2D]">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1">
                      <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      ABAC Security
                    </div>
                    <p className="text-[11px] text-zinc-500 leading-tight">
                      Zero-trust Cloud Firestore security rules.
                    </p>
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>

      </div>

      {/* Modals */}
      {showNewChat && (
        <NewChatModal
          onClose={() => setShowNewChat(false)}
          onSelectConversation={(id) => {
            setSelectedConversationId(id);
            setShowNewChat(false);
          }}
        />
      )}

      {showNewGroup && (
        <NewGroupModal
          onClose={() => setShowNewGroup(false)}
          onSelectConversation={(id) => {
            setSelectedConversationId(id);
            setShowNewGroup(false);
          }}
        />
      )}

      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ChatDashboard />
    </AuthProvider>
  );
}
