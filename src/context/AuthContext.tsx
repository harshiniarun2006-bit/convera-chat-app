import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db, getUserSettings, signOutUser } from '../services/firebase';
import { UserProfile, UserSettings } from '../types';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  userSettings: UserSettings | null;
  loading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
  updateSettingsState: (settings: Partial<UserSettings>) => void;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userProfile: null,
  userSettings: null,
  loading: true,
  error: null,
  signOut: async () => {},
  updateSettingsState: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
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

          // Fetch settings
          const settings = await getUserSettings(user.uid);
          if (settings) {
            setUserSettings(settings);
            // Apply theme
            if (settings.theme === 'dark') {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
          }

          // Mark presence as online
          await updateDoc(profileDocRef, {
            isOnline: true,
            lastSeen: serverTimestamp()
          }).catch(() => {});

        } catch (err) {
          console.error('Error fetching user profile:', err);
          setError('Failed to load profile data');
        }
      } else {
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }
        setUserProfile(null);
        setUserSettings(null);
      }
      setLoading(false);
    });

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

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const handleSignOut = async () => {
    if (currentUser) {
      await signOutUser(currentUser.uid);
    }
  };

  const updateSettingsState = (updates: Partial<UserSettings>) => {
    if (userSettings) {
      const updated = { ...userSettings, ...updates };
      setUserSettings(updated);
      if (updated.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
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
        updateSettingsState
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
