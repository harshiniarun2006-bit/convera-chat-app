import React, { useState } from 'react';
import { X, Users, Shield, LogOut, Edit2, Check, Info, Calendar } from 'lucide-react';
import { Conversation, ParticipantData } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { updateGroupDetails } from '../../services/firebase';

interface ConversationDetailsModalProps {
  conversation: Conversation;
  onClose: () => void;
  onLeaveConversation?: () => void;
}

export const ConversationDetailsModal: React.FC<ConversationDetailsModalProps> = ({
  conversation,
  onClose,
  onLeaveConversation
}) => {
  const { userProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(conversation.name || '');
  const [description, setDescription] = useState(conversation.description || '');
  const [saving, setSaving] = useState(false);

  const isAdmin = conversation.adminIds?.includes(userProfile?.uid || '') || false;
  const participants = Object.values(conversation.participantData || {});

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setSaving(true);
    try {
      await updateGroupDetails(conversation.id, {
        name: name.trim(),
        description: description.trim()
      });
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update group:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#FFF9F7] dark:bg-[#1E111C] w-full max-w-md rounded-3xl shadow-2xl border border-[#F7DCE3] dark:border-[#381B2D] overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#F7DCE3] dark:border-[#381B2D] flex items-center justify-between bg-white dark:bg-[#251422]">
          <h2 className="text-lg font-bold text-[#5C102A] dark:text-[#F7DCE3]">
            {conversation.type === 'group' ? 'Group Details' : 'Conversation Info'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Avatar and Info */}
          <div className="flex flex-col items-center text-center">
            <img
              src={conversation.avatarUrl || 'https://api.dicebear.com/7.x/identicon/svg?seed=cherry'}
              alt={conversation.name || 'Chat'}
              className="w-20 h-20 rounded-full object-cover border-4 border-[#8F1238] shadow-md mb-3"
            />

            {conversation.type === 'group' && isEditing ? (
              <form onSubmit={handleSaveDetails} className="w-full space-y-3">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-1.5 text-center font-bold text-base rounded-xl border border-[#E8CBD3] dark:border-[#452037] bg-white dark:bg-[#281324] text-zinc-900 dark:text-white"
                  required
                />
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Group description..."
                  rows={2}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-[#E8CBD3] dark:border-[#452037] bg-white dark:bg-[#281324] text-zinc-900 dark:text-white resize-none"
                />
                <div className="flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1 rounded-lg text-xs font-semibold bg-zinc-200 dark:bg-zinc-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-3 py-1 rounded-lg text-xs font-bold bg-[#8F1238] text-white"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <div className="flex items-center justify-center gap-2">
                  <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100">
                    {conversation.name || 'Convera Chat'}
                  </h3>
                  {conversation.type === 'group' && isAdmin && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="text-zinc-400 hover:text-[#8F1238] p-1"
                      title="Edit group details"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {conversation.description && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs">
                    {conversation.description}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Participants list */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                Participants ({participants.length})
              </span>
            </div>

            <div className="divide-y divide-[#F7DCE3]/60 dark:divide-[#381B2D] border border-[#F7DCE3] dark:border-[#381B2D] rounded-2xl bg-white dark:bg-[#251422] overflow-hidden">
              {participants.map((p) => {
                const memberIsAdmin = conversation.adminIds?.includes(p.uid);
                return (
                  <div key={p.uid} className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={p.avatarUrl || 'https://api.dicebear.com/7.x/shapes/svg?seed=cherry'}
                        alt={p.displayName}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <div>
                        <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                          {p.displayName}
                          {p.uid === userProfile?.uid && (
                            <span className="text-[10px] font-normal px-1.5 py-0.2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#8F1238] dark:text-[#E04D71]">
                          @{p.username}
                        </div>
                      </div>
                    </div>

                    {memberIsAdmin && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FCECF0] dark:bg-[#341828] text-[#8F1238] dark:text-[#F7DCE3]">
                        <Shield className="w-2.5 h-2.5" />
                        Admin
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
