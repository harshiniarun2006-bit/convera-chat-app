import React, { useState } from 'react';
import { X, User, Bell, Shield, Moon, Sun, LogOut, Check, Sparkles, Camera } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { updateProfile, updateSettings } from '../../services/firebase';

interface SettingsModalProps {
  onClose: () => void;
}

const CHERRY_AVATAR_PRESETS = [
  'cherry_queen',
  'ruby_spark',
  'velvet_rose',
  'crimson_bloom',
  'blush_petal',
  'sweet_berry'
];

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const { userProfile, userSettings, signOut, updateSettingsState, applyTheme } = useAuth();

  const [activeTab, setActiveTab] = useState<'profile' | 'appearance' | 'privacy'>('profile');
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [bio, setBio] = useState(userProfile?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(userProfile?.avatarUrl || '');
  const [soundEnabled, setSoundEnabled] = useState(userSettings?.soundEnabled ?? true);
  const [readReceipts, setReadReceipts] = useState(userSettings?.readReceipts ?? true);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(userSettings?.theme || 'light');
  const [lastSeenPrivacy, setLastSeenPrivacy] = useState<'everyone' | 'contacts' | 'nobody'>(
    userSettings?.lastSeenPrivacy || 'everyone'
  );

  const initialThemeRef = React.useRef(userSettings?.theme || 'light');
  const isSavedRef = React.useRef(false);

  React.useEffect(() => {
    try {
      const stored = (localStorage.getItem('convera_theme') as 'light' | 'dark' | 'system' | null) || userSettings?.theme || 'light';
      initialThemeRef.current = stored;
    } catch {
      initialThemeRef.current = userSettings?.theme || 'light';
    }

    return () => {
      if (!isSavedRef.current) {
        applyTheme(initialThemeRef.current);
      }
    };
  }, [applyTheme, userSettings?.theme]);

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    setSaving(true);
    setErrorMessage('');
    try {
      await updateProfile(userProfile.uid, {
        displayName: displayName.trim(),
        bio: bio.trim(),
        avatarUrl
      });

      await updateSettings(userProfile.uid, {
        soundEnabled,
        readReceipts,
        theme,
        lastSeenPrivacy
      });

      isSavedRef.current = true;
      initialThemeRef.current = theme;
      applyTheme(theme);
      updateSettingsState({ soundEnabled, readReceipts, theme, lastSeenPrivacy });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSelectPresetAvatar = (seed: string) => {
    const newUrl = `https://api.dicebear.com/7.x/shapes/svg?seed=${seed}&backgroundColor=8f1238,c52b50,f7dce3`;
    setAvatarUrl(newUrl);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#FFF9F7] dark:bg-[#1E111C] w-full max-w-lg rounded-3xl shadow-2xl border border-[#F7DCE3] dark:border-[#381B2D] overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#F7DCE3] dark:border-[#381B2D] flex items-center justify-between bg-white dark:bg-[#251422]">
          <h2 className="text-xl font-bold text-[#5C102A] dark:text-[#F7DCE3]">
            Settings & Profile
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#F7DCE3] dark:border-[#381B2D] px-6 bg-[#FCECF0]/50 dark:bg-[#1E111C]">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 py-3 px-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'profile'
                ? 'border-[#8F1238] text-[#8F1238] dark:border-[#E04D71] dark:text-[#E04D71]'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400'
            }`}
          >
            <User className="w-4 h-4" />
            Profile
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('appearance')}
            className={`flex items-center gap-2 py-3 px-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'appearance'
                ? 'border-[#8F1238] text-[#8F1238] dark:border-[#E04D71] dark:text-[#E04D71]'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400'
            }`}
          >
            <Moon className="w-4 h-4" />
            Appearance
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('privacy')}
            className={`flex items-center gap-2 py-3 px-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'privacy'
                ? 'border-[#8F1238] text-[#8F1238] dark:border-[#E04D71] dark:text-[#E04D71]'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400'
            }`}
          >
            <Shield className="w-4 h-4" />
            Privacy & Chat
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSaveProfile} className="p-6 overflow-y-auto space-y-6 flex-1">
          {errorMessage && (
            <div className="p-3 bg-rose-100 border border-rose-300 text-rose-800 rounded-xl text-sm">
              {errorMessage}
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="space-y-5">
              {/* Avatar Selection */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <img
                    src={avatarUrl || 'https://api.dicebear.com/7.x/shapes/svg?seed=cherry'}
                    alt="Current avatar"
                    className="w-24 h-24 rounded-full object-cover border-4 border-[#8F1238] shadow-md"
                  />
                  <div className="absolute bottom-0 right-0 p-1.5 rounded-full bg-[#8F1238] text-white shadow">
                    <Camera className="w-3.5 h-3.5" />
                  </div>
                </div>

                <div className="text-center">
                  <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Pick a Cherry Avatar Style
                  </span>
                  <div className="flex items-center gap-2 mt-2">
                    {CHERRY_AVATAR_PRESETS.map((preset) => {
                      const url = `https://api.dicebear.com/7.x/shapes/svg?seed=${preset}&backgroundColor=8f1238,c52b50,f7dce3`;
                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => handleSelectPresetAvatar(preset)}
                          className="w-8 h-8 rounded-full border-2 border-transparent hover:border-[#8F1238] overflow-hidden transition-transform hover:scale-110"
                        >
                          <img src={url} alt={preset} className="w-full h-full object-cover" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Display Name */}
              <div>
                <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={60}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E8CBD3] dark:border-[#452037] bg-white dark:bg-[#281324] text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#8F1238]"
                />
              </div>

              {/* Username (read-only for identity preservation) */}
              <div>
                <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                  Convera Username
                </label>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={`@${userProfile?.username || ''}`}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900/60 text-zinc-500 cursor-not-allowed text-sm"
                />
              </div>

              {/* Bio */}
              <div>
                <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                  About / Bio
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={200}
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E8CBD3] dark:border-[#452037] bg-white dark:bg-[#281324] text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#8F1238] resize-none"
                  placeholder="Share a short status..."
                />
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider mb-3">
                  Color Theme
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setTheme('light');
                      document.documentElement.classList.remove('dark');
                      document.documentElement.setAttribute('data-theme', 'light');
                    }}
                    className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                      theme === 'light'
                        ? 'border-[#8F1238] bg-[#FCECF0] text-[#5C102A]'
                        : 'border-[#E8CBD3] dark:border-[#381B2D] bg-white dark:bg-[#251422] text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <Sun className="w-5 h-5 text-amber-500" />
                    <div>
                      <div className="font-bold text-sm">Cherry Light</div>
                      <div className="text-xs opacity-75">Warm cream & rose</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTheme('dark');
                      document.documentElement.classList.add('dark');
                      document.documentElement.setAttribute('data-theme', 'dark');
                    }}
                    className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                      theme === 'dark'
                        ? 'border-[#E04D71] bg-[#341828] text-[#F7DCE3]'
                        : 'border-[#E8CBD3] dark:border-[#381B2D] bg-white dark:bg-[#251422] text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <Moon className="w-5 h-5 text-indigo-400" />
                    <div>
                      <div className="font-bold text-sm">Dark Plum</div>
                      <div className="text-xs opacity-75">Deep midnight cherry</div>
                    </div>
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-[#F7DCE3] dark:border-[#381B2D]">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm text-zinc-800 dark:text-zinc-100">
                      Message Chimes & Sounds
                    </div>
                    <div className="text-xs text-zinc-500">
                      Play pleasant cherry tone when receiving messages
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={soundEnabled}
                    onChange={(e) => setSoundEnabled(e.target.checked)}
                    className="w-5 h-5 accent-[#8F1238] rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm text-zinc-800 dark:text-zinc-100">
                    Read Receipts
                  </div>
                  <div className="text-xs text-zinc-500">
                    Show others when you have read their messages
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={readReceipts}
                  onChange={(e) => setReadReceipts(e.target.checked)}
                  className="w-5 h-5 accent-[#8F1238] rounded cursor-pointer"
                />
              </div>

              <div className="pt-4 border-t border-[#F7DCE3] dark:border-[#381B2D]">
                <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider mb-2">
                  Who can see when you were last online
                </label>
                <select
                  value={lastSeenPrivacy}
                  onChange={(e: any) => setLastSeenPrivacy(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E8CBD3] dark:border-[#452037] bg-white dark:bg-[#281324] text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#8F1238]"
                >
                  <option value="everyone">Everyone</option>
                  <option value="contacts">My Contacts only</option>
                  <option value="nobody">Nobody</option>
                </select>
              </div>

              <div className="pt-4 border-t border-[#F7DCE3] dark:border-[#381B2D] text-xs text-zinc-500 space-y-1">
                <p className="font-semibold text-zinc-700 dark:text-zinc-300">Convera Security:</p>
                <p>All database queries and mutations are secured via Cloud Firestore Attribute-Based Access Control (ABAC) rules. Unauthorized devices cannot access private conversations.</p>
              </div>
            </div>
          )}

          {/* Footer Save & Actions */}
          <div className="pt-4 border-t border-[#F7DCE3] dark:border-[#381B2D] flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                signOut();
                onClose();
              }}
              className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>

            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-cherry-gradient text-white font-semibold text-sm shadow-md hover:opacity-95 active:scale-98 transition-all disabled:opacity-50"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  Saved!
                </>
              ) : saving ? (
                'Saving...'
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
