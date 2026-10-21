import React, { useState } from 'react';
import { X, Users, Search, Plus, Check, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { searchUsers, createGroupChat } from '../../services/firebase';
import { UserProfile } from '../../types';

interface NewGroupModalProps {
  onClose: () => void;
  onSelectConversation: (conversationId: string) => void;
}

export const NewGroupModal: React.FC<NewGroupModalProps> = ({
  onClose,
  onSelectConversation
}) => {
  const { userProfile } = useAuth();
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const searchRequestIdRef = React.useRef(0);

  React.useEffect(() => {
    if (!userProfile?.uid) return;
    const reqId = ++searchRequestIdRef.current;
    setSearching(true);
    searchUsers('', userProfile.uid)
      .then((users) => {
        if (searchRequestIdRef.current === reqId) {
          setSearchResults(users);
        }
      })
      .catch((err) => console.warn('Group members directory fetch notice:', err))
      .finally(() => {
        if (searchRequestIdRef.current === reqId) {
          setSearching(false);
        }
      });
  }, [userProfile?.uid]);

  const handleInputChange = (val: string) => {
    setSearchTerm(val);
    if (!val.trim() && userProfile?.uid) {
      const reqId = ++searchRequestIdRef.current;
      setSearching(true);
      searchUsers('', userProfile.uid)
        .then((users) => {
          if (searchRequestIdRef.current === reqId) {
            setSearchResults(users);
          }
        })
        .catch((err) => console.warn('Group members directory fetch notice:', err))
        .finally(() => {
          if (searchRequestIdRef.current === reqId) {
            setSearching(false);
          }
        });
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    const reqId = ++searchRequestIdRef.current;
    setSearching(true);
    try {
      const users = await searchUsers(searchTerm, userProfile.uid);
      if (searchRequestIdRef.current === reqId) {
        setSearchResults(users);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (searchRequestIdRef.current === reqId) {
        setSearching(false);
      }
    }
  };

  const toggleMember = (user: UserProfile) => {
    if (selectedMembers.some(m => m.uid === user.uid)) {
      setSelectedMembers(selectedMembers.filter(m => m.uid !== user.uid));
    } else {
      setSelectedMembers([...selectedMembers, user]);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    if (!groupName.trim()) {
      setErrorMessage('Please give your group a name.');
      return;
    }
    if (selectedMembers.length === 0) {
      setErrorMessage('Please select at least 1 member to add to the group.');
      return;
    }

    setCreating(true);
    setErrorMessage('');
    try {
      const convId = await createGroupChat(
        userProfile,
        groupName.trim(),
        description.trim(),
        selectedMembers
      );
      onSelectConversation(convId);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#FFF9F7] dark:bg-[#1E111C] w-full max-w-lg rounded-3xl shadow-2xl border border-[#F7DCE3] dark:border-[#381B2D] overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#F7DCE3] dark:border-[#381B2D] flex items-center justify-between bg-white dark:bg-[#251422]">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#8F1238] dark:text-[#E04D71]" />
            <h2 className="text-lg font-bold text-[#5C102A] dark:text-[#F7DCE3]">
              Create New Group Chat
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleCreateGroup} className="p-6 overflow-y-auto space-y-5 flex-1">
          {errorMessage && (
            <div className="p-3 bg-rose-100 border border-rose-300 text-rose-800 rounded-xl text-xs">
              {errorMessage}
            </div>
          )}

          {/* Group Details */}
          <div>
            <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
              Group Name *
            </label>
            <input
              type="text"
              required
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g. Design Circle, Weekend Plans 🍒"
              maxLength={80}
              className="w-full px-4 py-2.5 rounded-xl border border-[#E8CBD3] dark:border-[#452037] bg-white dark:bg-[#281324] text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#8F1238]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
              Description (optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this group about?"
              maxLength={200}
              className="w-full px-4 py-2 rounded-xl border border-[#E8CBD3] dark:border-[#452037] bg-white dark:bg-[#281324] text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#8F1238]"
            />
          </div>

          {/* Selected Member Chips */}
          {selectedMembers.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider mb-2">
                Selected Members ({selectedMembers.length})
              </label>
              <div className="flex flex-wrap gap-2">
                {selectedMembers.map(m => (
                  <span
                    key={m.uid}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FCECF0] dark:bg-[#341828] text-xs font-semibold text-[#8F1238] dark:text-[#F7DCE3] border border-[#F7DCE3] dark:border-[#4E243D]"
                  >
                    <span>{m.displayName}</span>
                    <button
                      type="button"
                      onClick={() => toggleMember(m)}
                      className="hover:text-rose-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Search Members */}
          <div>
            <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
              Find Members to Invite
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder="Search by name or @username..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E8CBD3] dark:border-[#452037] bg-white dark:bg-[#281324] text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#8F1238]"
                />
              </div>
              <button
                type="button"
                onClick={handleSearch}
                disabled={searching || !searchTerm.trim()}
                className="px-4 py-2 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-semibold hover:bg-zinc-300 dark:hover:bg-zinc-700 disabled:opacity-50"
              >
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Find'}
              </button>
            </div>
          </div>

          {/* Search Results */}
          <div className="max-h-48 overflow-y-auto space-y-1.5">
            {searchResults.map(user => {
              const isSelected = selectedMembers.some(m => m.uid === user.uid);
              return (
                <div
                  key={user.uid}
                  onClick={() => toggleMember(user)}
                  className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer border transition-all ${
                    isSelected
                      ? 'border-[#8F1238] bg-[#FCECF0]/60 dark:bg-[#341828]/60'
                      : 'border-transparent hover:bg-white dark:hover:bg-[#251422]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <img
                      src={user.avatarUrl || 'https://api.dicebear.com/7.x/shapes/svg?seed=cherry'}
                      alt={user.displayName}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <div>
                      <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                        {user.displayName}
                      </div>
                      <div className="text-[11px] text-[#8F1238] dark:text-[#E04D71]">
                        @{user.username}
                      </div>
                    </div>
                  </div>

                  <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                    isSelected
                      ? 'bg-[#8F1238] border-[#8F1238] text-white'
                      : 'border-zinc-300 dark:border-zinc-600'
                  }`}>
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Submit */}
          <div className="pt-4 border-t border-[#F7DCE3] dark:border-[#381B2D] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || !groupName.trim() || selectedMembers.length === 0}
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-cherry-gradient text-white text-xs font-bold shadow-md hover:opacity-95 disabled:opacity-50 transition-all active:scale-95"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
              Create Group
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
