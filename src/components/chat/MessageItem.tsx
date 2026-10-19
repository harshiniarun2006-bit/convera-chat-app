import React, { useState } from 'react';
import {
  Check,
  CheckCheck,
  Smile,
  Reply,
  MoreVertical,
  Edit2,
  Trash2,
  Copy,
  Download,
  FileText
} from 'lucide-react';
import { Message } from '../../types';
import { AudioPlayer } from '../common/AudioPlayer';
import { toggleMessageReaction, editMessage, deleteMessage } from '../../services/firebase';

interface MessageItemProps {
  message: Message;
  currentUserId: string;
  isGroup?: boolean;
  onReply: (message: Message) => void;
  onViewImage: (url: string) => void;
}

const COMMON_REACTIONS = ['❤️', '🍒', '👍', '😂', '😮', '🔥'];

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  currentUserId,
  isGroup = false,
  onReply,
  onViewImage
}) => {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text);
  const [savingEdit, setSavingEdit] = useState(false);

  const isOutgoing = message.senderId === currentUserId;

  if (message.type === 'system') {
    return (
      <div className="flex justify-center my-3">
        <span className="px-3 py-1 rounded-full bg-[#FCECF0] dark:bg-[#2C1525] text-[#8F1238] dark:text-[#F7DCE3] text-[11px] font-semibold border border-[#F7DCE3]/60 dark:border-[#3F2236]">
          {message.text}
        </span>
      </div>
    );
  }

  const formatTime = (rawTime: any) => {
    if (!rawTime) return '';
    const date = rawTime.toDate ? rawTime.toDate() : new Date(rawTime);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleToggleReaction = async (emoji: string) => {
    setShowReactionPicker(false);
    try {
      await toggleMessageReaction(message.conversationId, message.id, emoji, currentUserId);
    } catch (err) {
      console.error('Failed to toggle reaction:', err);
    }
  };

  const handleSaveEdit = async () => {
    if (!editText.trim()) return;
    setSavingEdit(true);
    try {
      await editMessage(message.conversationId, message.id, editText);
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to edit message:', err);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Delete this message for everyone?')) {
      try {
        await deleteMessage(message.conversationId, message.id);
      } catch (err) {
        console.error('Failed to delete message:', err);
      }
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setShowActionMenu(false);
  };

  const reactions = message.reactions || {};
  const hasReactions = Object.keys(reactions).length > 0;

  return (
    <div
      className={`group relative flex gap-2.5 my-2.5 px-3 ${
        isOutgoing ? 'flex-row-reverse' : 'flex-row'
      }`}
    >
      {/* Participant Avatar (for groups or incoming) */}
      {!isOutgoing && (
        <img
          src={message.senderAvatar || 'https://api.dicebear.com/7.x/shapes/svg?seed=cherry'}
          alt={message.senderName}
          className="w-8 h-8 rounded-full object-cover shrink-0 mt-1 border border-[#8F1238]/20"
        />
      )}

      {/* Bubble Container */}
      <div className={`relative max-w-[85%] md:max-w-[70%] flex flex-col ${isOutgoing ? 'items-end' : 'items-start'}`}>
        
        {/* Sender name for group chats */}
        {!isOutgoing && isGroup && (
          <span className="text-[11px] font-bold text-[#8F1238] dark:text-[#E04D71] mb-1 ml-2">
            {message.senderName}
          </span>
        )}

        {/* Replying banner */}
        {message.replyTo && (
          <div
            className={`mb-1 px-3 py-1.5 rounded-xl text-xs max-w-full border-l-3 transition-colors ${
              isOutgoing
                ? 'bg-white/20 border-white text-white'
                : 'bg-zinc-200/60 dark:bg-zinc-800/80 border-[#8F1238] dark:border-[#E04D71] text-zinc-700 dark:text-zinc-300'
            }`}
          >
            <div className="font-bold text-[10px] opacity-80">
              Replying to {message.replyTo.senderName}
            </div>
            <div className="line-clamp-1 italic text-[11px] opacity-90">
              {message.replyTo.text}
            </div>
          </div>
        )}

        {/* Main Message Bubble */}
        <div
          className={`relative px-4 py-2.5 rounded-3xl shadow-sm text-sm transition-all ${
            isOutgoing
              ? 'bg-cherry-gradient text-white rounded-tr-sm'
              : 'bg-white dark:bg-[#2A1624] text-zinc-900 dark:text-zinc-100 rounded-tl-sm border border-[#F7DCE3] dark:border-[#3F2034]'
          } ${message.isDeleted ? 'opacity-65 italic' : ''}`}
        >
          {/* Image Content */}
          {message.type === 'image' && message.mediaUrl && !message.isDeleted && (
            <div className="mb-2 overflow-hidden rounded-2xl cursor-pointer">
              <img
                src={message.mediaUrl}
                alt="Uploaded media"
                onClick={() => onViewImage(message.mediaUrl!)}
                className="max-h-72 w-full object-cover rounded-2xl hover:opacity-95 transition-opacity"
              />
            </div>
          )}

          {/* Voice Audio Message */}
          {message.type === 'audio' && message.mediaUrl && !message.isDeleted && (
            <AudioPlayer
              src={message.mediaUrl}
              duration={message.audioDuration}
              isOutgoing={isOutgoing}
            />
          )}

          {/* File Attachment */}
          {message.type === 'file' && message.mediaUrl && !message.isDeleted && (
            <a
              href={message.mediaUrl}
              download={message.fileName || 'file'}
              target="_blank"
              rel="noreferrer"
              className={`flex items-center gap-2.5 p-2.5 rounded-2xl mb-1 transition-colors ${
                isOutgoing ? 'bg-white/15 hover:bg-white/25 text-white' : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-800 dark:text-zinc-200'
              }`}
            >
              <FileText className="w-5 h-5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-xs truncate">{message.fileName || 'Attachment'}</div>
                {message.fileSize && (
                  <div className="text-[10px] opacity-75">
                    {Math.round(message.fileSize / 1024)} KB
                  </div>
                )}
              </div>
              <Download className="w-4 h-4 shrink-0 opacity-70" />
            </a>
          )}

          {/* Text Message Content */}
          {isEditing ? (
            <div className="space-y-2 mt-1">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={2}
                className="w-full p-2 text-xs text-zinc-900 bg-white rounded-xl border border-zinc-300 resize-none"
              />
              <div className="flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-2 py-0.5 rounded text-[11px] bg-white/20 text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={savingEdit}
                  className="px-2.5 py-0.5 rounded text-[11px] bg-white text-[#8F1238] font-bold"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <p className="whitespace-pre-wrap break-words leading-relaxed">
              {message.text}
            </p>
          )}

          {/* Footer: timestamp, edited badge, read receipts */}
          <div
            className={`flex items-center justify-end gap-1 text-[10px] mt-1 select-none ${
              isOutgoing ? 'text-white/80' : 'text-zinc-400'
            }`}
          >
            {message.isEdited && !message.isDeleted && <span>(edited)</span>}
            <span>{formatTime(message.createdAt)}</span>
            {isOutgoing && (
              <CheckCheck className="w-3.5 h-3.5 text-white/90" />
            )}
          </div>
        </div>

        {/* Reaction Badges */}
        {hasReactions && !message.isDeleted && (
          <div className="flex flex-wrap gap-1 mt-1 z-10">
            {Object.entries(reactions).map(([emoji, userIds]) => {
              if (userIds.length === 0) return null;
              const userReacted = userIds.includes(currentUserId);
              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleToggleReaction(emoji)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold shadow-xs border transition-all ${
                    userReacted
                      ? 'bg-[#FCECF0] dark:bg-[#3D1D34] border-[#8F1238] dark:border-[#E04D71] text-[#8F1238] dark:text-[#F7DCE3]'
                      : 'bg-white dark:bg-[#251422] border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  <span>{emoji}</span>
                  <span className="text-[10px]">{userIds.length}</span>
                </button>
              );
            })}
          </div>
        )}

      </div>

      {/* Hover Floating Actions Menu */}
      {!message.isDeleted && (
        <div
          className={`opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 self-center ${
            isOutgoing ? 'flex-row-reverse' : 'flex-row'
          }`}
        >
          {/* Reaction Picker Trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowReactionPicker(!showReactionPicker)}
              className="p-1.5 rounded-full text-zinc-400 hover:text-[#8F1238] dark:hover:text-[#F7DCE3] hover:bg-white dark:hover:bg-[#2D1624] transition-colors"
              title="React"
            >
              <Smile className="w-4 h-4" />
            </button>

            {showReactionPicker && (
              <div className="absolute bottom-full mb-1 left-0 z-20 flex items-center gap-1 p-1 rounded-full bg-white dark:bg-[#2D1624] shadow-lg border border-[#F7DCE3] dark:border-[#3F2034]">
                {COMMON_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleToggleReaction(emoji)}
                    className="p-1 hover:scale-125 transition-transform"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Reply Button */}
          <button
            type="button"
            onClick={() => onReply(message)}
            className="p-1.5 rounded-full text-zinc-400 hover:text-[#8F1238] dark:hover:text-[#F7DCE3] hover:bg-white dark:hover:bg-[#2D1624] transition-colors"
            title="Reply"
          >
            <Reply className="w-4 h-4" />
          </button>

          {/* More Action menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowActionMenu(!showActionMenu)}
              className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-white dark:hover:bg-[#2D1624] transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showActionMenu && (
              <div className="absolute right-0 bottom-full mb-1 z-20 w-32 py-1 rounded-2xl bg-white dark:bg-[#251422] shadow-xl border border-zinc-200 dark:border-zinc-800 text-xs">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="w-full flex items-center gap-2 px-3 py-2 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy
                </button>
                {isOutgoing && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(true);
                        setShowActionMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleDelete();
                        setShowActionMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
