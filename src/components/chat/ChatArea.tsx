import React, { useState, useEffect, useRef } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc
} from 'firebase/firestore';
import {
  Phone,
  Video,
  Info,
  ChevronLeft,
  Search,
  Users,
  Shield,
  Loader2,
  Sparkles
} from 'lucide-react';
import {
  db,
  handleFirestoreError,
  OperationType,
  markAsRead
} from '../../services/firebase';
import { Conversation, Message, ParticipantData, ReplyInfo } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { MessageItem } from './MessageItem';
import { MessageInput } from './MessageInput';
import { ImageViewerModal } from '../common/ImageViewerModal';
import { VoiceCallModal } from '../modals/VoiceCallModal';
import { ConversationDetailsModal } from '../modals/ConversationDetailsModal';

interface ChatAreaProps {
  conversationId: string;
  onBackMobile?: () => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  conversationId,
  onBackMobile
}) => {
  const { currentUser, userProfile } = useAuth();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyTo, setReplyTo] = useState<ReplyInfo | null>(null);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [showVoiceCall, setShowVoiceCall] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Listen to conversation document
  useEffect(() => {
    if (!conversationId) return;

    const convRef = doc(db, 'conversations', conversationId);
    const unsubscribeConv = onSnapshot(
      convRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setConversation({ id: snapshot.id, ...snapshot.data() } as Conversation);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `conversations/${conversationId}`);
      }
    );

    return () => unsubscribeConv();
  }, [conversationId]);

  // Listen to messages subcollection
  useEffect(() => {
    if (!conversationId || !currentUser) return;

    setLoading(true);
    const messagesQuery = query(
      collection(db, 'conversations', conversationId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribeMessages = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const msgs: Message[] = [];
        snapshot.forEach((d) => {
          msgs.push({ id: d.id, ...d.data() } as Message);
        });
        setMessages(msgs);
        setLoading(false);

        // Mark conversation as read only if the latest message is from another participant
        const latestMsg = msgs[msgs.length - 1];
        if (latestMsg && latestMsg.senderId !== currentUser.uid) {
          markAsRead(conversationId, currentUser.uid);
        }
      },
      (error) => {
        setLoading(false);
        console.error('Messages subscription notice:', error);
      }
    );

    return () => unsubscribeMessages();
  }, [conversationId, currentUser]);

  // Listen to typing indicators
  useEffect(() => {
    if (!conversationId || !currentUser) return;

    const typingCol = collection(db, 'conversations', conversationId, 'typing');
    const unsubscribeTyping = onSnapshot(typingCol, (snapshot) => {
      const activeTypers: string[] = [];
      const now = Date.now();

      snapshot.forEach((d) => {
        const data = d.data();
        if (data.userId !== currentUser.uid && data.isTyping) {
          activeTypers.push(data.displayName || 'Someone');
        }
      });
      setTypingUsers(activeTypers);
    });

    return () => unsubscribeTyping();
  }, [conversationId, currentUser]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  if (!conversation) {
    return (
      <div className="h-full flex items-center justify-center bg-[#FFF9F7] dark:bg-[#1C0F1A]">
        <Loader2 className="w-8 h-8 animate-spin text-[#8F1238] dark:text-[#E04D71]" />
      </div>
    );
  }

  // Determine partner profile
  const isGroup = conversation.type === 'group';
  const otherUid = conversation.participantIds.find((id) => id !== currentUser?.uid);
  const partnerData: ParticipantData | null =
    !isGroup && otherUid && conversation.participantData
      ? conversation.participantData[otherUid]
      : null;

  const title = isGroup
    ? conversation.name || 'Group Chat'
    : partnerData?.displayName || 'Convera User';

  const subtitle = isGroup
    ? `${conversation.participantIds.length} members`
    : partnerData?.username ? `@${partnerData.username}` : '';

  const avatarUrl = isGroup
    ? conversation.avatarUrl || 'https://api.dicebear.com/7.x/identicon/svg?seed=cherry'
    : partnerData?.avatarUrl || 'https://api.dicebear.com/7.x/shapes/svg?seed=cherry';

  // Group messages by date
  const filteredMessages = messages.filter((m) => {
    if (!searchQuery.trim()) return true;
    return m.text?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="h-full flex flex-col bg-[#FFF3F5] dark:bg-[#170C15] relative overflow-hidden">
      
      {/* Top Header */}
      <div className="px-4 py-3 bg-[#FFF9F7] dark:bg-[#1E111C] border-b border-[#F7DCE3] dark:border-[#33182A] flex items-center justify-between shadow-xs z-10">
        <div className="flex items-center gap-3">
          {onBackMobile && (
            <button
              onClick={onBackMobile}
              className="md:hidden p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          <div
            onClick={() => setShowDetails(true)}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="relative">
              <img
                src={avatarUrl}
                alt={title}
                className="w-10 h-10 rounded-full object-cover border-2 border-[#8F1238]/30 shadow-xs group-hover:scale-105 transition-transform"
              />
              {!isGroup && (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-[#1E111C] rounded-full" />
              )}
            </div>

            <div>
              <h3 className="font-bold text-sm text-[#5C102A] dark:text-[#F7DCE3] group-hover:underline flex items-center gap-1.5">
                {title}
                {isGroup && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#FCECF0] dark:bg-[#321727] text-[#8F1238] dark:text-[#F7DCE3] font-normal">
                    Group
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-[#C52B50] dark:text-[#E04D71] font-medium leading-none mt-0.5">
                {typingUsers.length > 0 ? (
                  <span className="italic animate-pulse">
                    {typingUsers.join(', ')} typing...
                  </span>
                ) : (
                  subtitle
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowSearch(!showSearch)}
            className={`p-2 rounded-full transition-colors ${
              showSearch
                ? 'bg-[#FCECF0] dark:bg-[#341828] text-[#8F1238]'
                : 'text-zinc-500 hover:text-[#8F1238] dark:hover:text-[#F7DCE3] hover:bg-white dark:hover:bg-[#251422]'
            }`}
            title="Search messages"
          >
            <Search className="w-4 h-4" />
          </button>

          {!isGroup && (
            <button
              type="button"
              onClick={() => setShowVoiceCall(true)}
              className="p-2 rounded-full text-zinc-500 hover:text-[#8F1238] dark:hover:text-[#F7DCE3] hover:bg-white dark:hover:bg-[#251422] transition-colors"
              title="Voice call"
            >
              <Phone className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowDetails(true)}
            className="p-2 rounded-full text-zinc-500 hover:text-[#8F1238] dark:hover:text-[#F7DCE3] hover:bg-white dark:hover:bg-[#251422] transition-colors"
            title="Conversation info"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* In-chat search bar */}
      {showSearch && (
        <div className="px-4 py-2 bg-[#FFF9F7] dark:bg-[#20101E] border-b border-[#F7DCE3] dark:border-[#381B2D] flex items-center gap-2">
          <Search className="w-3.5 h-3.5 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search within this chat..."
            className="flex-1 text-xs bg-transparent border-none focus:outline-none text-zinc-800 dark:text-zinc-200"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-zinc-400 text-xs">
              Clear
            </button>
          )}
        </div>
      )}

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-[#8F1238] dark:text-[#E04D71]" />
          </div>
        ) : filteredMessages.length > 0 ? (
          filteredMessages.map((msg) => (
            <MessageItem
              key={msg.id}
              message={msg}
              currentUserId={currentUser?.uid || ''}
              isGroup={isGroup}
              onReply={(m) => setReplyTo({ messageId: m.id, senderName: m.senderName, text: m.text })}
              onViewImage={(url) => setActiveImage(url)}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-[#FCECF0] dark:bg-[#2D1624] flex items-center justify-center text-[#8F1238] dark:text-[#E04D71] mb-3 shadow-inner">
              <Sparkles className="w-7 h-7" />
            </div>
            <h4 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
              {searchQuery ? 'No matching messages' : `Start of conversation`}
            </h4>
            <p className="text-xs text-zinc-500 max-w-xs mt-1">
              {searchQuery
                ? 'Try a different keyword or clear search.'
                : 'Say hello and start the conversation! All messages sync in real time.'}
            </p>
          </div>
        )}

        {/* Typing indicator bubble */}
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-500 dark:text-zinc-400 italic">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#8F1238] animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#8F1238] animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#8F1238] animate-bounce [animation-delay:0.4s]" />
            </div>
            <span>{typingUsers.join(', ')} is typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Box */}
      {userProfile && (
        <MessageInput
          conversationId={conversationId}
          currentUser={userProfile}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
        />
      )}

      {/* Image Lightbox */}
      {activeImage && (
        <ImageViewerModal
          imageUrl={activeImage}
          onClose={() => setActiveImage(null)}
        />
      )}

      {/* Voice Call Overlay */}
      {showVoiceCall && (
        <VoiceCallModal
          partner={partnerData}
          onClose={() => setShowVoiceCall(false)}
        />
      )}

      {/* Conversation / Group Details */}
      {showDetails && (
        <ConversationDetailsModal
          conversation={conversation}
          onClose={() => setShowDetails(false)}
        />
      )}

    </div>
  );
};
