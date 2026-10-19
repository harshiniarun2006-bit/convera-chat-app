import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile as firebaseUpdateProfile,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  serverTimestamp,
  addDoc,
  arrayUnion,
  arrayRemove,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL
} from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';
import { Conversation, Message, UserProfile, UserSettings, ParticipantData } from '../types';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// CRITICAL: Must use firestoreDatabaseId from firebase-applet-config.json
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app);

export const googleProvider = new GoogleAuthProvider();

// Error handling conforming strictly to FirestoreErrorInfo requirement
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const origCode = (error as any)?.code || 'unknown';
  const rawMsg = error instanceof Error ? error.message : String(error);
  const formattedError = `[${origCode}] ${rawMsg}`;

  const errInfo: FirestoreErrorInfo = {
    error: formattedError,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error(`Firestore ${operationType.toUpperCase()} error at [${path || 'root'}]:`, formattedError, JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Mandatory test connection check
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firebase client is currently offline or connecting...");
    }
    return false;
  }
}

// Initial connection test run
testConnection();

// --- Auth & User Profile Services ---

export async function checkUsernameAvailable(rawUsername: string): Promise<boolean> {
  const username = rawUsername.trim().toLowerCase();
  if (username.length < 2) return false;
  try {
    const snap = await getDoc(doc(db, 'usernames', username));
    return !snap.exists();
  } catch (err) {
    console.error('Error checking username:', err);
    return true;
  }
}

export async function createUserAccount(
  email: string,
  pass: string,
  displayName: string,
  rawUsername: string
): Promise<FirebaseUser> {
  const username = rawUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (!username || username.length < 2) {
    throw new Error('Username must be at least 2 alphanumeric characters.');
  }

  const isAvailable = await checkUsernameAvailable(username);
  if (!isAvailable) {
    throw new Error(`Username @${username} is already taken. Please choose another.`);
  }

  const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
  const user = userCredential.user;

  await firebaseUpdateProfile(user, { displayName });

  const profile: UserProfile = {
    uid: user.uid,
    displayName: displayName.trim(),
    username,
    avatarUrl: `https://api.dicebear.com/7.x/shapes/svg?seed=${username}&backgroundColor=8f1238,c52b50,f7dce3`,
    bio: 'Hey there! I am using Convera 🍒',
    isOnline: true,
    lastSeen: serverTimestamp(),
    createdAt: serverTimestamp()
  };

  const settings: UserSettings = {
    email: user.email || email,
    readReceipts: true,
    soundEnabled: true,
    theme: 'light',
    lastSeenPrivacy: 'everyone',
    blockedUsers: [],
    updatedAt: serverTimestamp()
  };

  try {
    // Write public user profile
    await setDoc(doc(db, 'users', user.uid), profile);
    // Write private settings
    await setDoc(doc(db, 'users', user.uid, 'private', 'settings'), settings);
    // Claim username index
    await setDoc(doc(db, 'usernames', username), {
      uid: user.uid,
      username,
      createdAt: serverTimestamp()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
  }

  return user;
}

export const firebaseProjectId = firebaseConfig.projectId;

export async function signInUser(email: string, pass: string): Promise<FirebaseUser> {
  const userCredential = await signInWithEmailAndPassword(auth, email, pass);
  // Update online status
  try {
    await updateDoc(doc(db, 'users', userCredential.user.uid), {
      isOnline: true,
      lastSeen: serverTimestamp()
    });
  } catch {
    // Ignore if first time
  }
  return userCredential.user;
}

export async function authenticateTestUser(userNum: 1 | 2): Promise<FirebaseUser> {
  const credentials = userNum === 1
    ? {
        email: 'user1@convera.chat',
        password: 'Password123!',
        displayName: 'Alex Cherry',
        username: 'alex'
      }
    : {
        email: 'user2@convera.chat',
        password: 'Password123!',
        displayName: 'Sam Blossom',
        username: 'sam'
      };

  // Sign out any active session first to guarantee clean, independent user sessions
  if (auth.currentUser) {
    try {
      await signOutUser(auth.currentUser.uid);
    } catch {
      // Ignore
    }
  }

  try {
    // Attempt sign in with existing test credentials
    return await signInUser(credentials.email, credentials.password);
  } catch (err: any) {
    const code = err?.code || '';
    const msg = err?.message || '';
    
    // If account doesn't exist yet, automatically create it with a distinct Firebase UID
    if (
      code === 'auth/user-not-found' ||
      code === 'auth/invalid-credential' ||
      code === 'auth/invalid-login-credentials' ||
      msg.includes('user-not-found') ||
      msg.includes('invalid-credential')
    ) {
      return await createUserAccount(
        credentials.email,
        credentials.password,
        credentials.displayName,
        credentials.username
      );
    }
    // Re-throw if provider is disabled (auth/operation-not-allowed) or network error
    throw err;
  }
}

export async function signInWithGoogleAccount(): Promise<FirebaseUser> {
  const userCredential = await signInWithPopup(auth, googleProvider);
  const user = userCredential.user;

  // Check if profile exists
  const userDocRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userDocRef);

  if (!snap.exists()) {
    const baseName = user.displayName || user.email?.split('@')[0] || 'cherry';
    let username = baseName.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
    if (username.length < 3) username = `user_${user.uid.slice(0, 6)}`;

    // Ensure unique username
    let uniqueUsername = username;
    let counter = 1;
    while (!(await checkUsernameAvailable(uniqueUsername))) {
      uniqueUsername = `${username}${counter}`;
      counter++;
    }

    const profile: UserProfile = {
      uid: user.uid,
      displayName: user.displayName || 'Convera User',
      username: uniqueUsername,
      avatarUrl: user.photoURL || `https://api.dicebear.com/7.x/shapes/svg?seed=${uniqueUsername}&backgroundColor=8f1238,c52b50,f7dce3`,
      bio: 'Hey there! I am using Convera 🍒',
      isOnline: true,
      lastSeen: serverTimestamp(),
      createdAt: serverTimestamp()
    };

    const settings: UserSettings = {
      email: user.email || '',
      readReceipts: true,
      soundEnabled: true,
      theme: 'light',
      lastSeenPrivacy: 'everyone',
      blockedUsers: [],
      updatedAt: serverTimestamp()
    };

    try {
      await setDoc(userDocRef, profile);
      await setDoc(doc(db, 'users', user.uid, 'private', 'settings'), settings);
      await setDoc(doc(db, 'usernames', uniqueUsername), {
        uid: user.uid,
        username: uniqueUsername,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
    }
  } else {
    // Update online status
    try {
      await updateDoc(userDocRef, {
        isOnline: true,
        lastSeen: serverTimestamp()
      });
    } catch {
      // Ignore
    }
  }

  return user;
}

export async function signOutUser(uid?: string) {
  if (uid) {
    try {
      await updateDoc(doc(db, 'users', uid), {
        isOnline: false,
        lastSeen: serverTimestamp()
      });
    } catch {
      // Ignore
    }
  }
  return firebaseSignOut(auth);
}

export async function sendPasswordReset(email: string) {
  return sendPasswordResetEmail(auth, email);
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `users/${uid}`);
  }
}

export async function getUserSettings(uid: string): Promise<UserSettings | null> {
  try {
    const snap = await getDoc(doc(db, 'users', uid, 'private', 'settings'));
    if (snap.exists()) {
      return snap.data() as UserSettings;
    }
    return null;
  } catch (err) {
    return null;
  }
}

export async function updateProfile(uid: string, updates: Partial<UserProfile>): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', uid), updates);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
  }
}

export async function updateSettings(uid: string, updates: Partial<UserSettings>): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', uid, 'private', 'settings'), {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${uid}/private/settings`);
  }
}

export async function searchUsers(searchTerm: string, currentUid: string): Promise<UserProfile[]> {
  const term = searchTerm.trim().toLowerCase();
  if (!term) return [];

  try {
    // First try exact username search in usernames index
    const cleanUsername = term.startsWith('@') ? term.slice(1) : term;
    const usernameSnap = await getDoc(doc(db, 'usernames', cleanUsername));
    
    const results: UserProfile[] = [];

    if (usernameSnap.exists()) {
      const targetUid = usernameSnap.data().uid;
      if (targetUid !== currentUid) {
        const profile = await getUserProfile(targetUid);
        if (profile) results.push(profile);
      }
    }

    // Also query users collection
    const usersQuery = query(
      collection(db, 'users'),
      limit(20)
    );
    const snap = await getDocs(usersQuery);
    snap.forEach((d) => {
      const data = d.data() as UserProfile;
      if (data.uid !== currentUid && !results.some(r => r.uid === data.uid)) {
        if (
          data.username?.toLowerCase().includes(term) ||
          data.displayName?.toLowerCase().includes(term)
        ) {
          results.push(data);
        }
      }
    });

    return results;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'users');
  }
}

// --- Conversations Services ---

export function getDirectConversationId(uid1: string, uid2: string): string {
  const sorted = [uid1, uid2].sort();
  return `direct_${sorted[0]}_${sorted[1]}`;
}

export async function getOrCreateDirectConversation(
  currentUser: UserProfile,
  targetUser: UserProfile
): Promise<string> {
  const currentUid = auth.currentUser?.uid || currentUser.uid;
  if (!currentUid) {
    throw new Error('You must be signed in to start a conversation.');
  }
  if (!targetUser?.uid) {
    throw new Error('Target user is invalid.');
  }
  if (currentUid === targetUser.uid) {
    throw new Error('Cannot start a direct conversation with yourself.');
  }

  const conversationId = getDirectConversationId(currentUid, targetUser.uid);
  const convRef = doc(db, 'conversations', conversationId);

  try {
    const snap = await getDoc(convRef);
    if (!snap.exists()) {
      const participantData: Record<string, ParticipantData> = {
        [currentUid]: {
          uid: currentUid,
          displayName: currentUser.displayName || 'Convera User',
          username: currentUser.username || 'user',
          avatarUrl: currentUser.avatarUrl || ''
        },
        [targetUser.uid]: {
          uid: targetUser.uid,
          displayName: targetUser.displayName || 'Convera User',
          username: targetUser.username || 'user',
          avatarUrl: targetUser.avatarUrl || ''
        }
      };

      const newConversation: Partial<Conversation> = {
        id: conversationId,
        type: 'direct',
        participantIds: [currentUid, targetUser.uid],
        participantData,
        createdById: currentUid,
        lastMessageText: '',
        lastMessageTime: serverTimestamp(),
        lastRead: {
          [currentUid]: serverTimestamp()
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(convRef, newConversation);
    }
    return conversationId;
  } catch (err: any) {
    const origCode = err?.code || 'unknown';
    const origMsg = err?.message || String(err);
    console.error(`[getOrCreateDirectConversation] Failed at conversations/${conversationId}: [${origCode}] ${origMsg}`);
    handleFirestoreError(err, OperationType.WRITE, `conversations/${conversationId}`);
  }
}

export async function createGroupChat(
  currentUser: UserProfile,
  name: string,
  description: string,
  participants: UserProfile[],
  avatarUrl?: string
): Promise<string> {
  const currentUid = auth.currentUser?.uid || currentUser.uid;
  if (!currentUid) {
    throw new Error('You must be signed in to create a group.');
  }

  const conversationId = `group_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const convRef = doc(db, 'conversations', conversationId);

  const allMembers = [currentUser, ...participants];
  const participantIds = allMembers.map(m => m.uid || currentUid);
  const participantData: Record<string, ParticipantData> = {};

  allMembers.forEach(m => {
    const uid = m.uid || currentUid;
    participantData[uid] = {
      uid,
      displayName: m.displayName || 'Member',
      username: m.username || 'member',
      avatarUrl: m.avatarUrl || ''
    };
  });

  const groupAvatar = avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${name}&backgroundColor=8f1238,c52b50`;

  const newConversation: Partial<Conversation> = {
    id: conversationId,
    type: 'group',
    name: name.trim(),
    description: description.trim(),
    avatarUrl: groupAvatar,
    participantIds,
    participantData,
    adminIds: [currentUid],
    createdById: currentUid,
    lastMessageText: `${currentUser.displayName || 'Admin'} created group "${name}"`,
    lastMessageSenderId: currentUid,
    lastMessageTime: serverTimestamp(),
    lastMessageType: 'system',
    lastRead: {
      [currentUid]: serverTimestamp()
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  try {
    await setDoc(convRef, newConversation);

    // Add initial system message
    await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
      id: '',
      conversationId,
      senderId: currentUser.uid,
      senderName: 'Convera',
      type: 'system',
      text: `${currentUser.displayName} created group "${name}"`,
      createdAt: serverTimestamp()
    });

    return conversationId;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `conversations/${conversationId}`);
  }
}

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs = 12000,
  errorMsg = 'Message operation timed out. Please check your network connection.'
): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(errorMsg));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }
}

export async function sendMessage(
  conversationId: string,
  sender: UserProfile,
  messageData: {
    type?: 'text' | 'image' | 'file' | 'audio';
    text?: string;
    mediaUrl?: string;
    fileName?: string;
    fileSize?: number;
    audioDuration?: number;
    replyTo?: { messageId: string; senderName: string; text: string };
  }
): Promise<string> {
  const currentAuthUid = auth.currentUser?.uid;
  if (!currentAuthUid) {
    throw new Error('You must be signed in to send a message.');
  }

  const type = messageData.type || 'text';
  const text = messageData.text?.trim() || '';

  if (!text && !messageData.mediaUrl && type === 'text') {
    throw new Error('Cannot send an empty message.');
  }

  const messagesColRef = collection(db, 'conversations', conversationId, 'messages');
  const convRef = doc(db, 'conversations', conversationId);
  const messageDocRef = doc(messagesColRef);
  const messageId = messageDocRef.id;

  // Build sanitized message payload without any undefined values
  const msgPayload: Record<string, any> = {
    id: messageId,
    conversationId,
    senderId: currentAuthUid,
    senderName: sender.displayName || 'User',
    senderAvatar: sender.avatarUrl || '',
    type,
    text,
    mediaUrl: messageData.mediaUrl || '',
    fileName: messageData.fileName || '',
    fileSize: messageData.fileSize || 0,
    audioDuration: messageData.audioDuration || 0,
    reactions: {},
    isEdited: false,
    isDeleted: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  if (messageData.replyTo && messageData.replyTo.messageId) {
    msgPayload.replyTo = {
      messageId: messageData.replyTo.messageId,
      senderName: messageData.replyTo.senderName || '',
      text: messageData.replyTo.text || ''
    };
  }

  let previewText = text;
  if (type === 'image') previewText = '📷 Photo';
  else if (type === 'audio') previewText = '🎤 Voice message';
  else if (type === 'file') previewText = `📎 ${messageData.fileName || 'File'}`;

  try {
    // 1. Commit message creation to Firestore with timeout guard
    await withTimeout(
      setDoc(messageDocRef, msgPayload),
      12000,
      'Message send request timed out. Please check your network and try again.'
    );

    // 2. Resiliently update conversation metadata without failing the message delivery
    try {
      await updateDoc(convRef, {
        lastMessageText: previewText.slice(0, 300),
        lastMessageSenderId: currentAuthUid,
        lastMessageTime: serverTimestamp(),
        lastMessageType: type,
        [`lastRead.${currentAuthUid}`]: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch {
      // In case updateDoc encounters a schema difference, fallback to setDoc merge
      try {
        await setDoc(
          convRef,
          {
            lastMessageText: previewText.slice(0, 300),
            lastMessageSenderId: currentAuthUid,
            lastMessageTime: serverTimestamp(),
            lastMessageType: type,
            updatedAt: serverTimestamp()
          },
          { merge: true }
        );
      } catch (metaErr) {
        console.warn('Non-critical conversation metadata update notice:', metaErr);
      }
    }

    return messageId;
  } catch (err: any) {
    const origCode = err?.code || 'unknown';
    const origMsg = err?.message || String(err);
    console.error(`[sendMessage] Failed at conversations/${conversationId}/messages: [${origCode}] ${origMsg}`, err);
    handleFirestoreError(err, OperationType.WRITE, `conversations/${conversationId}/messages`);
  }
}

export async function toggleMessageReaction(
  conversationId: string,
  messageId: string,
  emoji: string,
  userId: string
): Promise<void> {
  const msgRef = doc(db, 'conversations', conversationId, 'messages', messageId);
  try {
    const snap = await getDoc(msgRef);
    if (!snap.exists()) return;
    const data = snap.data() as Message;
    const currentReactions = data.reactions || {};
    const existingList = currentReactions[emoji] || [];

    let updatedList: string[];
    if (existingList.includes(userId)) {
      updatedList = existingList.filter(id => id !== userId);
    } else {
      updatedList = [...existingList, userId];
    }

    const newReactions = { ...currentReactions };
    if (updatedList.length === 0) {
      delete newReactions[emoji];
    } else {
      newReactions[emoji] = updatedList;
    }

    await updateDoc(msgRef, {
      reactions: newReactions,
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `conversations/${conversationId}/messages/${messageId}`);
  }
}

export async function editMessage(
  conversationId: string,
  messageId: string,
  newText: string
): Promise<void> {
  const msgRef = doc(db, 'conversations', conversationId, 'messages', messageId);
  try {
    await updateDoc(msgRef, {
      text: newText.trim(),
      isEdited: true,
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `conversations/${conversationId}/messages/${messageId}`);
  }
}

export async function deleteMessage(
  conversationId: string,
  messageId: string
): Promise<void> {
  const msgRef = doc(db, 'conversations', conversationId, 'messages', messageId);
  try {
    await updateDoc(msgRef, {
      text: 'This message was deleted',
      isDeleted: true,
      mediaUrl: '',
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `conversations/${conversationId}/messages/${messageId}`);
  }
}

export async function setTypingStatus(
  conversationId: string,
  userId: string,
  displayName: string,
  isTyping: boolean
): Promise<void> {
  const typingRef = doc(db, 'conversations', conversationId, 'typing', userId);
  try {
    if (isTyping) {
      await setDoc(typingRef, {
        userId,
        displayName,
        isTyping: true,
        updatedAt: serverTimestamp()
      });
    } else {
      await deleteDoc(typingRef);
    }
  } catch {
    // Ephemeral, safe to ignore
  }
}

export async function markAsRead(conversationId: string, userId: string): Promise<void> {
  const convRef = doc(db, 'conversations', conversationId);
  try {
    await updateDoc(convRef, {
      [`lastRead.${userId}`]: serverTimestamp()
    });
  } catch {
    // Ignore minor read update errors
  }
}

export async function updateGroupDetails(
  conversationId: string,
  updates: { name?: string; description?: string; avatarUrl?: string }
): Promise<void> {
  const convRef = doc(db, 'conversations', conversationId);
  try {
    await updateDoc(convRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `conversations/${conversationId}`);
  }
}

// Media upload with storage and resilient base64 fallback
export async function uploadMediaFile(
  path: string,
  file: File | Blob,
  fileName: string
): Promise<string> {
  try {
    const storageRef = ref(storage, `${path}/${Date.now()}_${fileName}`);
    const uploadTask = await uploadBytesResumable(storageRef, file);
    const url = await getDownloadURL(uploadTask.ref);
    return url;
  } catch (storageError) {
    console.warn('Storage upload encountered error, falling back to data URL:', storageError);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}
