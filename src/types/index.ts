export type ConversationType = 'direct' | 'group';

export interface UserProfile {
  uid: string;
  displayName: string;
  username: string;
  displayNameLower?: string;
  usernameLower?: string;
  avatarUrl?: string;
  bio?: string;
  isOnline?: boolean;
  lastSeen?: any; // Firestore Timestamp or ISO string
  createdAt?: any;
}

export interface UserSettings {
  email: string;
  readReceipts: boolean;
  soundEnabled: boolean;
  theme: 'light' | 'dark' | 'system';
  lastSeenPrivacy: 'everyone' | 'contacts' | 'nobody';
  blockedUsers?: string[];
  updatedAt?: any;
}

export interface ParticipantData {
  uid: string;
  displayName: string;
  username: string;
  avatarUrl?: string;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  participantIds: string[];
  participantData?: Record<string, ParticipantData>;
  name?: string;
  description?: string;
  avatarUrl?: string;
  adminIds?: string[];
  createdById: string;
  lastMessageId?: string;
  lastMessageText?: string;
  lastMessageSenderId?: string;
  lastMessageTime?: any;
  lastMessageType?: 'text' | 'image' | 'file' | 'audio' | 'system';
  lastRead?: Record<string, any>;
  createdAt: any;
  updatedAt: any;
}

export type MessageType = 'text' | 'image' | 'file' | 'audio' | 'system';

export interface ReplyInfo {
  messageId: string;
  senderName: string;
  text: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  type: MessageType;
  text: string;
  mediaUrl?: string;
  fileName?: string;
  fileSize?: number;
  audioDuration?: number;
  replyTo?: ReplyInfo;
  reactions?: Record<string, string[]>; // emoji -> array of userIds
  isEdited?: boolean;
  isDeleted?: boolean;
  isP2P?: boolean;
  createdAt: any;
  updatedAt?: any;
}

export interface TypingIndicator {
  userId: string;
  displayName: string;
  isTyping: boolean;
  updatedAt: any;
}
