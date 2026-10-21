import React, { useState } from 'react';
import { X, Search, MessageSquare, UserPlus, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { searchUsers, getOrCreateDirectConversation } from '../../services/firebase';
import { UserProfile } from '../../types';

interface NewChatModalProps {
  onClose: () => void;
  onSelectConversation: (conversationId: string) => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({
  onClose,
  onSelectConversation
}) => {
  const { userProfile } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<UserProfile[]>([]);
  const [searched, setSearched] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const searchRequestIdRef = React.useRef(0);

  React.useEffect(() => {
    if (!userProfile?.uid) return;
    const reqId = ++searchRequestIdRef.current;
    setLoading(true);
    searchUsers('', userProfile.uid)
      .then((users) => {
        if (searchRequestIdRef.current === reqId) {
          setResults(users);
        }
      })
      .catch((err) => console.warn('Directory fetch notice:', err))
      .finally(() => {
        if (searchRequestIdRef.current === reqId) {
          setLoading(false);
        }
      });
  }, [userProfile?.uid]);

  const handleInputChange = (val: string) => {
    setSearchTerm(val);
    if (!val.trim() && userProfile?.uid) {
      setSearched(false);
      const reqId = ++searchRequestIdRef.current;
      setLoading(true);
      searchUsers('', userProfile.uid)
        .then((users) => {
          if (searchRequestIdRef.current === reqId) {
            setResults(users);
          }
        })
        .catch((err) => console.warn('Directory fetch notice:', err))
        .finally(() => {
          if (searchRequestIdRef.current === reqId) {
            setLoading(false);
          }
        });
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    const reqId = ++searchRequestIdRef.current;
    setLoading(true);
    setSearched(true);
    setError(null);
    try {
      const users = await searchUsers(searchTerm, userProfile.uid);
      if (searchRequestIdRef.current === reqId) {
        setResults(users);
      }
    } catch (err: any) {
      if (searchRequestIdRef.current === reqId) {
        console.error('Search error:', err);
        setError(err?.message || 'Failed to search users');
      }
    } finally {
      if (searchRequestIdRef.current === reqId) {
        setLoading(false);
      }
    }
  };

  const handleStartChat = async (targetUser: UserProfile) => {
    if (!userProfile) return;
    setOpeningId(targetUser.uid);
    setError(null);
    try {
      const convId = await getOrCreateDirectConversation(userProfile, targetUser);
      onSelectConversation(convId);
      onClose();
    } catch (err: any) {
      console.error('Failed to start chat:', err);
      setError(err?.message || 'Failed to start conversation. Please try again.');
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#FFF9F7] dark:bg-[#1E111C] w-full max-w-md rounded-3xl shadow-2xl border border-[#F7DCE3] dark:border-[#381B2D] overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#F7DCE3] dark:border-[#381B2D] flex items-center justify-between bg-white dark:bg-[#251422]">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-[#8F1238] dark:text-[#E04D71]" />
            <h2 className="text-lg font-bold text-[#5C102A] dark:text-[#F7DCE3]">
              Start New Conversation
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="p-4 bg-white/70 dark:bg-[#20101E] border-b border-[#F7DCE3] dark:border-[#381B2D]">
          <form onSubmit={handleSearch} className="relative flex items-center">
            <Search className="w-4 h-4 absolute left-3.5 text-zinc-400" />
            <input
              type="text"
              autoFocus
              value={searchTerm}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Search by @username or name..."
              className="w-full pl-10 pr-20 py-2.5 rounded-xl border border-[#E8CBD3] dark:border-[#452037] bg-white dark:bg-[#281324] text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#8F1238]"
            />
            <button
              type="submit"
              disabled={loading || !searchTerm.trim()}
              className="absolute right-1.5 px-3 py-1.5 rounded-lg bg-cherry-gradient text-white text-xs font-semibold shadow hover:opacity-90 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Search'}
            </button>
          </form>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-2 px-1">
            Tip: Type exact username like <span className="font-mono text-[#8F1238] dark:text-[#E04D71]">@username</span> to find any registered person.
          </p>

          {error && (
            <div className="mt-2.5 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
              {error}
            </div>
          )}
        </div>

        {/* Results List */}
        <div className="p-4 overflow-y-auto space-y-2 flex-1 min-h-[220px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
              <Loader2 className="w-7 h-7 animate-spin text-[#8F1238] dark:text-[#E04D71] mb-2" />
              <p className="text-xs">Searching Convora network...</p>
            </div>
          ) : results.length > 0 ? (
            results.map((u) => (
              <div
                key={u.uid}
                className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-[#251422] border border-[#F7DCE3] dark:border-[#381B2D] hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={u.avatarUrl || 'https://api.dicebear.com/7.x/shapes/svg?seed=cherry'}
                      alt={u.displayName}
                      className="w-11 h-11 rounded-full object-cover border-2 border-[#8F1238]/30"
                    />
                    {u.isOnline && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-[#251422] rounded-full" />
                    )}
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 leading-tight">
                      {u.displayName}
                    </h4>
                    <p className="text-xs text-[#8F1238] dark:text-[#E04D71] font-medium">
                      @{u.username}
                    </p>
                    {u.bio && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1 mt-0.5">
                        {u.bio}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleStartChat(u)}
                  disabled={openingId === u.uid}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#8F1238] hover:bg-[#A31640] text-white text-xs font-semibold shadow transition-all active:scale-95 disabled:opacity-50"
                >
                  {openingId === u.uid ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <MessageSquare className="w-3.5 h-3.5" />
                      Chat
                    </>
                  )}
                </button>
              </div>
            ))
          ) : searched ? (
            <div className="text-center py-12 text-zinc-400">
              <p className="text-sm font-medium">No users found for "{searchTerm}"</p>
              <p className="text-xs mt-1">Make sure the username is spelled correctly.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center text-zinc-400">
              <div className="w-12 h-12 rounded-full bg-[#FCECF0] dark:bg-[#2C1525] flex items-center justify-center text-[#8F1238] dark:text-[#E04D71] mb-2">
                <Sparkles className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Connect with anyone on Convora
              </h4>
              <p className="text-xs max-w-xs mt-1 text-zinc-500">
                Search for friends, colleagues, or family across any device or location.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
