import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db, getUserSettings, signOutUser, updateSettings } from '../services/firebase';
import { UserProfile, UserSettings } from '../types';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  userSettings: UserSettings | null;
  loading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
  updateSettingsState: (settings: Partial<UserSettings>) => void;
  toggleTheme: () => Promise<void>;
  isDark: boolean;
  applyTheme: (theme?: 'light' | 'dark' | 'system') => void;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userProfile: null,
  userSettings: null,
  loading: true,
  error: null,
  signOut: async () => {},
  updateSettingsState: () => {},
  toggleTheme: async () => {},
  isDark: false,
  applyTheme: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  const applyTheme = (theme?: 'light' | 'dark' | 'system') => {
    const activeTheme = theme || 'light';
    const darkActive =
      activeTheme === 'dark' ||
      ((!theme || activeTheme === 'system') &&
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (darkActive) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }

    setIsDark(darkActive);

    try {
      localStorage.setItem('convera_theme', activeTheme);
    } catch {}
  };

  useEffect(() => {
    // Initial theme setup from localStorage immediately
    try {
      const savedTheme = localStorage.getItem('convera_theme') as 'light' | 'dark' | 'system' | null;
      if (savedTheme) {
        applyTheme(savedTheme);
      }
    } catch {}

    let unsubscribeProfile: (() => void) | null = null;
    let heartbeatInterval: any = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      // Clean up previous profile listener if any
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }

      setCurrentUser(user);
      if (user) {
        try {
          // Listen to real-time updates for user profile
          const profileDocRef = doc(db, 'users', user.uid);
          unsubscribeProfile = onSnapshot(profileDocRef, (snap) => {
            if (snap.exists()) {
              setUserProfile(snap.data() as UserProfile);
            }
          });

          // Fetch settings & apply theme
          const settings = await getUserSettings(user.uid);
          if (settings) {
            setUserSettings(settings);
            applyTheme(settings.theme);
          }

          // Mark presence as online
          await updateDoc(profileDocRef, {
            isOnline: true,
            lastSeen: serverTimestamp()
          }).catch(() => {});

          // Liveness heartbeat every 60s
          heartbeatInterval = setInterval(() => {
            if (auth.currentUser && !document.hidden) {
              updateDoc(doc(db, 'users', auth.currentUser.uid), {
                isOnline: true,
                lastSeen: serverTimestamp()
              }).catch(() => {});
            }
          }, 60000);

        } catch (err) {
          console.error('Error fetching user profile:', err);
          setError('Failed to load profile data');
        }
      } else {
        setUserProfile(null);
        setUserSettings(null);
      }
      setLoading(false);
    });

    // Presence visibility change handler
    const handleVisibilityChange = () => {
      if (auth.currentUser) {
        const profileRef = doc(db, 'users', auth.currentUser.uid);
        if (document.hidden) {
          updateDoc(profileRef, {
            lastSeen: serverTimestamp()
          }).catch(() => {});
        } else {
          updateDoc(profileRef, {
            isOnline: true,
            lastSeen: serverTimestamp()
          }).catch(() => {});
        }
      }
    };

    // Cleanup on window unload: set user offline
    const handleBeforeUnload = () => {
      if (auth.currentUser) {
        const profileRef = doc(db, 'users', auth.currentUser.uid);
        updateDoc(profileRef, {
          isOnline: false,
          lastSeen: serverTimestamp()
        }).catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const handleSignOut = async () => {
    if (currentUser) {
      await signOutUser(currentUser.uid);
    }
  };

  const updateSettingsState = (updates: Partial<UserSettings>) => {
    setUserSettings((prev) => {
      const base: UserSettings = prev || {
        email: currentUser?.email || '',
        soundEnabled: true,
        readReceipts: true,
        theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
        lastSeenPrivacy: 'everyone'
      };
      const updated: UserSettings = { ...base, ...updates };
      if (updates.theme) {
        applyTheme(updated.theme);
      }
      return updated;
    });
  };

  const toggleTheme = async () => {
    const isCurrentlyDark = document.documentElement.classList.contains('dark');
    const nextTheme: 'light' | 'dark' = isCurrentlyDark ? 'light' : 'dark';

    applyTheme(nextTheme);

    setUserSettings((prev) => {
      const base: UserSettings = prev || {
        email: currentUser?.email || '',
        soundEnabled: true,
        readReceipts: true,
        theme: nextTheme,
        lastSeenPrivacy: 'everyone'
      };
      return { ...base, theme: nextTheme };
    });

    if (currentUser?.uid) {
      try {
        await updateSettings(currentUser.uid, { theme: nextTheme });
      } catch (err) {
        console.error('Failed to sync theme preference:', err);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        userSettings,
        loading,
        error,
        signOut: handleSignOut,
        updateSettingsState,
        toggleTheme,
        isDark,
        applyTheme
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
