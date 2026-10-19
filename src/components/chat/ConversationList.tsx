import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot
} from 'firebase/firestore';
import {
  Search,
  Plus,
  Users,
  MessageSquare,
  Sparkles,
  CheckCheck,
  Check
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../../services/firebase';
import { Conversation, ParticipantData } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface ConversationListProps {
  selectedConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onOpenNewChat: () => void;
  onOpenNewGroup: () => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  selectedConversationId,
  onSelectConversation,
  onOpenNewChat,
  onOpenNewGroup
}) => {
  const { currentUser, userProfile } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'direct' | 'group' | 'unread'>('all');

  useEffect(() => {
    if (!currentUser) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const convsQuery = query(
      collection(db, 'conversations'),
      where('participantIds', 'array-contains', currentUser.uid)
    );

    const unsubscribe = onSnapshot(
      convsQuery,
      (snapshot) => {
        const list: Conversation[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as Conversation);
        });

        // Client-side sort by updatedAt descending
        list.sort((a, b) => {
          const timeA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : (a.updatedAt ? new Date(a.updatedAt).getTime() : 0);
          const timeB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : (b.updatedAt ? new Date(b.updatedAt).getTime() : 0);
          return timeB - timeA;
        });

        setConversations(list);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'conversations');
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  const getConversationDisplay = (conv: Conversation) => {
    if (conv.type === 'group') {
      return {
        title: conv.name || 'Group Chat',
        subtitle: `@${conv.participantIds.length} members`,
        avatarUrl: conv.avatarUrl || 'https://api.dicebear.com/7.x/identicon/svg?seed=cherry',
        isOnline: false
      };
    }

    // Direct chat: get partner
    const otherUid = conv.participantIds.find((id) => id !== currentUser?.uid);
    const partnerData = otherUid && conv.participantData ? conv.participantData[otherUid] : null;

    return {
      title: partnerData?.displayName || 'Convera User',
      subtitle: partnerData?.username ? `@${partnerData.username}` : '',
      avatarUrl: partnerData?.avatarUrl || 'https://api.dicebear.com/7.x/shapes/svg?seed=cherry',
      isOnline: false
    };
  };

  const hasUnread = (conv: Conversation): boolean => {
    if (!currentUser || !conv.lastMessageTime) return false;
    if (conv.lastMessageSenderId === currentUser.uid) return false;

    const lastReadTime = conv.lastRead?.[currentUser.uid];
    if (!lastReadTime) return true;

    const readMillis = lastReadTime.toMillis ? lastReadTime.toMillis() : new Date(lastReadTime).getTime();
    const msgMillis = conv.lastMessageTime.toMillis ? conv.lastMessageTime.toMillis() : new Date(conv.lastMessageTime).getTime();

    return msgMillis > readMillis;
  };

  const formatMessageTime = (rawTime: any) => {
    if (!rawTime) return '';
    const date = rawTime.toDate ? rawTime.toDate() : new Date(rawTime);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Filter conversations
  const filteredConversations = conversations.filter((conv) => {
    if (activeTab === 'direct' && conv.type !== 'direct') return false;
    if (activeTab === 'group' && conv.type !== 'group') return false;
    if (activeTab === 'unread' && !hasUnread(conv)) return false;

    if (!searchFilter.trim()) return true;

    const queryLower = searchFilter.toLowerCase();
    const display = getConversationDisplay(conv);
    return (
      display.title.toLowerCase().includes(queryLower) ||
      display.subtitle.toLowerCase().includes(queryLower) ||
      conv.lastMessageText?.toLowerCase().includes(queryLower)
    );
  });

  return (
    <div className="h-full flex flex-col bg-[#FFF9F7] dark:bg-[#1C0F1A] border-r border-[#F7DCE3] dark:border-[#33182A]">
      
      {/* Top Header & New Action Buttons */}
      <div className="p-4 border-b border-[#F7DCE3] dark:border-[#33182A]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold text-[#5C102A] dark:text-[#F7DCE3] tracking-tight">
            Messages
          </h2>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onOpenNewChat}
              className="p-2 rounded-xl bg-[#FCECF0] hover:bg-[#F7DCE3] dark:bg-[#2C1525] dark:hover:bg-[#3D1D34] text-[#8F1238] dark:text-[#F7DCE3] transition-colors"
              title="New direct chat"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onOpenNewGroup}
              className="p-2 rounded-xl bg-[#FCECF0] hover:bg-[#F7DCE3] dark:bg-[#2C1525] dark:hover:bg-[#3D1D34] text-[#8F1238] dark:text-[#F7DCE3] transition-colors"
              title="New group"
            >
              <Users className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E8CBD3] dark:border-[#452037] bg-white dark:bg-[#251422] text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#8F1238]"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 mt-3 overflow-x-auto no-scrollbar">
          {(['all', 'direct', 'group', 'unread'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 rounded-full text-xs font-semibold capitalize whitespace-nowrap transition-all ${
                activeTab === tab
                  ? 'bg-[#8F1238] text-white shadow-sm'
                  : 'bg-white dark:bg-[#251422] text-zinc-600 dark:text-zinc-400 hover:bg-[#FCECF0] dark:hover:bg-[#341828]'
              }`}
            >
              {tab === 'all' ? 'All Chats' : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Conversations Stream */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#F7DCE3]/50 dark:divide-[#2D1625]">
        {loading ? (
          <div className="p-8 text-center text-xs text-zinc-400">
            Loading conversations...
          </div>
        ) : filteredConversations.length > 0 ? (
          filteredConversations.map((conv) => {
            const isSelected = selectedConversationId === conv.id;
            const display = getConversationDisplay(conv);
            const isUnread = hasUnread(conv);

            return (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`flex items-center gap-3.5 p-3.5 cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-[#FCECF0] dark:bg-[#341828] border-l-4 border-[#8F1238] dark:border-[#E04D71]'
                    : 'hover:bg-white/60 dark:hover:bg-[#231220]'
                }`}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <img
                    src={display.avatarUrl}
                    alt={display.title}
                    className="w-12 h-12 rounded-full object-cover border border-[#8F1238]/20 shadow-sm"
                  />
                  {conv.type === 'group' && (
                    <div className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-[#8F1238] text-white shadow">
                      <Users className="w-2.5 h-2.5" />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3
                      className={`text-sm truncate font-bold ${
                        isSelected
                          ? 'text-[#8F1238] dark:text-[#F7DCE3]'
                          : isUnread
                          ? 'text-zinc-950 dark:text-white font-extrabold'
                          : 'text-zinc-800 dark:text-zinc-200'
                      }`}
                    >
                      {display.title}
                    </h3>
                    <span className="text-[11px] text-zinc-400 shrink-0 ml-2">
                      {formatMessageTime(conv.lastMessageTime)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <p
                      className={`text-xs truncate ${
                        isUnread
                          ? 'text-zinc-900 dark:text-zinc-100 font-semibold'
                          : 'text-zinc-500 dark:text-zinc-400'
                      }`}
                    >
                      {conv.lastMessageText || 'No messages yet'}
                    </p>

                    {isUnread && (
                      <span className="w-2.5 h-2.5 rounded-full bg-[#C52B50] shrink-0 ml-2 shadow-sm animate-pulse" />
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-[#FCECF0] dark:bg-[#2C1525] flex items-center justify-center text-[#8F1238] dark:text-[#E04D71] mb-3">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
              No conversations found
            </h4>
            <p className="text-xs text-zinc-400 mt-1 max-w-[200px]">
              Start a new chat to connect with friends and teammates.
            </p>
            <button
              type="button"
              onClick={onOpenNewChat}
              className="mt-4 px-4 py-2 rounded-xl bg-cherry-gradient text-white text-xs font-bold shadow hover:opacity-90"
            >
              Start Conversation
            </button>
          </div>
        )}
      </div>

    </div>
  );
};
