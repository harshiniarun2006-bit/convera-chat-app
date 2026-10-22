import React, { useState } from 'react';
import { Mail, Lock, User, AtSign, ArrowRight, Sparkles, Loader2, KeyRound, AlertTriangle, ExternalLink } from 'lucide-react';
import confetti from 'canvas-confetti';
import { CherryLogo } from '../common/CherryLogo';
import {
  createUserAccount,
  signInUser,
  signInWithGoogleAccount,
  sendPasswordReset,
  checkUsernameAvailable,
  authenticateTestUser,
  firebaseProjectId
} from '../../services/firebase';

export const AuthModal: React.FC = () => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [providerDisabled, setProviderDisabled] = useState(false);
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const [googleProviderDisabled, setGoogleProviderDisabled] = useState(false);
  const checkTimeoutRef = React.useRef<any>(null);
  const usernameRequestIdRef = React.useRef<number>(0);

  const handleUsernameChange = (val: string) => {
    const clean = val.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 25);
    setUsername(clean);

    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current);
      checkTimeoutRef.current = null;
    }

    if (clean.length < 2) {
      usernameRequestIdRef.current++;
      setUsernameStatus('idle');
      return;
    }

    setUsernameStatus('checking');
    const currentReq = ++usernameRequestIdRef.current;
    checkTimeoutRef.current = setTimeout(async () => {
      try {
        const isAvailable = await checkUsernameAvailable(clean);
        if (usernameRequestIdRef.current === currentReq) {
          setUsernameStatus(isAvailable ? 'available' : 'taken');
        }
      } catch {
        if (usernameRequestIdRef.current === currentReq) {
          setUsernameStatus('idle');
        }
      }
    }, 350);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setProviderDisabled(false);
    setLoading(true);

    try {
      if (mode === 'signup') {
        if (!displayName.trim()) throw new Error('Please enter your name.');
        if (!username || username.length < 2) throw new Error('Please enter a username of at least 2 characters.');

        // Cancel any pending debounced check and check availability directly
        if (checkTimeoutRef.current) {
          clearTimeout(checkTimeoutRef.current);
          checkTimeoutRef.current = null;
        }

        if (usernameStatus === 'taken') {
          throw new Error('This username is already taken.');
        }

        // If status is still checking or unverified, wait for direct availability check
        if (usernameStatus !== 'available') {
          setUsernameStatus('checking');
          const isAvailable = await checkUsernameAvailable(username);
          if (!isAvailable) {
            setUsernameStatus('taken');
            throw new Error('This username is already taken. Please choose another.');
          }
          setUsernameStatus('available');
        }

        if (password.length < 6) throw new Error('Password must be at least 6 characters.');

        await createUserAccount(email, password, displayName, username);
        try {
          confetti({
            particleCount: 70,
            spread: 60,
            colors: ['#8F1238', '#C52B50', '#F7DCE3', '#FFD1DC']
          });
        } catch {}
      } else if (mode === 'signin') {
        await signInUser(email, password);
      } else if (mode === 'forgot') {
        await sendPasswordReset(email);
        setInfoMessage('Password reset link sent! Check your email inbox.');
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      let msg = err.message || 'Authentication error';
      if (msg.includes('auth/operation-not-allowed') || err.code === 'auth/operation-not-allowed') {
        setProviderDisabled(true);
        msg = 'Email/Password sign-in is disabled in your Firebase project. Please enable it in the Firebase Console.';
      } else if (msg.includes('auth/invalid-credential') || msg.includes('auth/user-not-found') || msg.includes('auth/wrong-password')) {
        msg = 'Invalid email or password. Please try again.';
      } else if (msg.includes('auth/email-already-in-use')) {
        msg = 'An account with this email already exists. Try signing in.';
      } else if (msg.includes('auth/weak-password')) {
        msg = 'Password should be at least 6 characters.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleTestUserLogin = async (userNum: 1 | 2) => {
    setError(null);
    setInfoMessage(null);
    setProviderDisabled(false);
    setLoading(true);

    try {
      await authenticateTestUser(userNum);
      try {
        confetti({
          particleCount: 50,
          spread: 50,
          colors: ['#8F1238', '#C52B50', '#F7DCE3']
        });
      } catch {}
    } catch (err: any) {
      console.error('Test user login error:', err);
      if (err.message?.includes('auth/operation-not-allowed') || err.code === 'auth/operation-not-allowed') {
        setProviderDisabled(true);
        setError('Email/Password provider is disabled in your Firebase Console. Follow the steps below to enable it.');
      } else {
        setError(err.message || 'Failed to authenticate test user');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setProviderDisabled(false);
    setUnauthorizedDomain(null);
    setGoogleProviderDisabled(false);
    setLoading(true);
    try {
      await signInWithGoogleAccount();
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      const code = err?.code || '';
      const msg = err?.message || '';

      if (code === 'auth/unauthorized-domain' || msg.includes('unauthorized-domain')) {
        const currentDomain = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
        setUnauthorizedDomain(currentDomain);
      } else if (code === 'auth/operation-not-allowed' || msg.includes('operation-not-allowed')) {
        setGoogleProviderDisabled(true);
      } else if (code === 'auth/popup-blocked' || msg.includes('popup-blocked')) {
        setError('The Google sign-in popup was blocked by your browser. Please allow popups for this site and try again.');
      } else if (!msg.includes('popup-closed-by-user') && code !== 'auth/popup-closed-by-user') {
        setError(msg || 'Google sign-in was interrupted');
      }
    } finally {
      setLoading(false);
    }
  };

  // Quick testing helper to populate sample test credentials into form
  const fillTestAccount = (userNum: 1 | 2) => {
    setProviderDisabled(false);
    setError(null);
    if (userNum === 1) {
      setEmail('user1@convora.chat');
      setPassword('Password123!');
      setDisplayName('Alex Cherry');
      handleUsernameChange('alex');
    } else {
      setEmail('user2@convora.chat');
      setPassword('Password123!');
      setDisplayName('Sam Blossom');
      handleUsernameChange('sam');
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-[#FFF3F5] via-[#FFF9F7] to-[#FCECF0] dark:from-[#170C15] dark:via-[#21131D] dark:to-[#120810] relative overflow-hidden">
      
      {/* Decorative cherry ambient glow */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-[#C52B50]/10 dark:bg-[#8F1238]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-[#8F1238]/10 dark:bg-[#C52B50]/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white/90 dark:bg-[#20101E]/95 backdrop-blur-xl rounded-3xl shadow-cherry-lg border border-[#F7DCE3] dark:border-[#3F2236] p-8 z-10 transition-all">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <CherryLogo size="lg" className="justify-center mb-2" />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs mt-1">
            Real-time, cross-network messaging designed for genuine connection.
          </p>
        </div>

        {/* Tab switcher: Sign In vs Sign Up */}
        {mode !== 'forgot' && (
          <div className="flex p-1 rounded-2xl bg-[#FCECF0] dark:bg-[#2C1525] mb-6">
            <button
              type="button"
              onClick={() => { setMode('signin'); setError(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                mode === 'signin'
                  ? 'bg-white dark:bg-[#3D1D34] text-[#8F1238] dark:text-[#F7DCE3] shadow-sm'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setError(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                mode === 'signup'
                  ? 'bg-white dark:bg-[#3D1D34] text-[#8F1238] dark:text-[#F7DCE3] shadow-sm'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Error / Info messages */}
        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-medium">
            {error}
          </div>
        )}

        {infoMessage && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
            {infoMessage}
          </div>
        )}

        {providerDisabled && (
          <div className="mb-5 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-100 text-xs">
            <div className="flex items-center gap-2 font-bold mb-1.5 text-amber-800 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>Action Required in Firebase Console</span>
            </div>
            <p className="leading-relaxed mb-2 text-zinc-700 dark:text-zinc-300">
              The <strong>Email/Password</strong> sign-in provider is disabled by default in your Firebase project (<code className="font-mono bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 rounded text-[11px] font-bold">{firebaseProjectId}</code>).
            </p>
            <div className="bg-white/80 dark:bg-[#1E111C] p-2.5 rounded-xl border border-amber-200 dark:border-amber-900 mb-3 space-y-1 text-[11px]">
              <div className="font-semibold text-zinc-800 dark:text-zinc-200">How to enable in 10 seconds:</div>
              <ol className="list-decimal pl-4 space-y-0.5 text-zinc-600 dark:text-zinc-400">
                <li>Click the button below to open Sign-in providers in Firebase.</li>
                <li>Click on <strong>Email/Password</strong>.</li>
                <li>Toggle <strong>Enable</strong> to ON and click <strong>Save</strong>.</li>
                <li>Return here and click <strong>User 1</strong> or <strong>User 2</strong>!</li>
              </ol>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={`https://console.firebase.google.com/project/${firebaseProjectId}/authentication/providers`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm transition-colors"
              >
                <span>Open Firebase Console</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <span className="text-[11px] text-zinc-500">
                (Or use Google Sign-In below)
              </span>
            </div>
          </div>
        )}

        {unauthorizedDomain && (
          <div className="mb-5 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-100 text-xs">
            <div className="flex items-center gap-2 font-bold mb-1.5 text-amber-800 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>Domain Not Authorized for Google Sign-In</span>
            </div>
            <p className="leading-relaxed mb-2 text-zinc-700 dark:text-zinc-300">
              The domain <code className="font-mono bg-amber-100 dark:bg-amber-900/60 px-1.5 py-0.5 rounded text-[11px] font-bold text-amber-900 dark:text-amber-200">{unauthorizedDomain}</code> is not in your Firebase project's Authorized Domains list (<code className="font-mono bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 rounded text-[11px] font-bold">{firebaseProjectId}</code>).
            </p>
            <div className="bg-white/80 dark:bg-[#1E111C] p-2.5 rounded-xl border border-amber-200 dark:border-amber-900 mb-3 space-y-1 text-[11px]">
              <div className="font-semibold text-zinc-800 dark:text-zinc-200">How to authorize in 3 steps:</div>
              <ol className="list-decimal pl-4 space-y-0.5 text-zinc-600 dark:text-zinc-400">
                <li>Click <strong>Open Firebase Settings</strong> below.</li>
                <li>Under <strong>Authorized domains</strong>, click <strong>Add domain</strong>.</li>
                <li>Enter <code className="font-mono font-bold text-zinc-900 dark:text-zinc-100">{unauthorizedDomain}</code> and click <strong>Save</strong>.</li>
              </ol>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={`https://console.firebase.google.com/project/${firebaseProjectId}/authentication/settings`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm transition-colors"
              >
                <span>Authorize {unauthorizedDomain} in Console</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        )}

        {googleProviderDisabled && (
          <div className="mb-5 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-100 text-xs">
            <div className="flex items-center gap-2 font-bold mb-1.5 text-amber-800 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>Google Sign-In Provider Disabled</span>
            </div>
            <p className="leading-relaxed mb-2 text-zinc-700 dark:text-zinc-300">
              The Google sign-in provider is disabled in Firebase project <code className="font-mono bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 rounded text-[11px] font-bold">{firebaseProjectId}</code>. Enable it in the Firebase Console under Authentication &gt; Sign-in method.
            </p>
            <a
              href={`https://console.firebase.google.com/project/${firebaseProjectId}/authentication/providers`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm transition-colors"
            >
              <span>Enable Google Provider</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* Google Sign In Button */}
        {mode !== 'forgot' && (
          <div className="mb-5">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 hover:border-[#8F1238] dark:hover:border-[#E04D71] bg-white dark:bg-[#281324] text-xs font-bold text-zinc-700 dark:text-zinc-200 shadow-sm transition-all active:scale-98 disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              Continue with Google
            </button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-200 dark:border-zinc-800" />
              </div>
              <div className="relative flex justify-center text-[11px] uppercase tracking-wider text-zinc-400 bg-white dark:bg-[#20101E] px-2">
                Or with email
              </div>
            </div>
          </div>
        )}

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'signup' && (
            <>
              <div>
                <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Maya Chen"
                    maxLength={60}
                    className="w-full pl-9 pr-3 py-2.5 rounded-2xl border border-[#E8CBD3] dark:border-[#452037] bg-white dark:bg-[#281324] text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#8F1238]"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider">
                    Username
                  </label>
                  {usernameStatus === 'checking' && (
                    <span className="text-[10px] text-zinc-400">checking...</span>
                  )}
                  {usernameStatus === 'available' && (
                    <span className="text-[10px] font-semibold text-emerald-500">Available ✓</span>
                  )}
                  {usernameStatus === 'taken' && (
                    <span className="text-[10px] font-semibold text-rose-500">Already taken</span>
                  )}
                </div>
                <div className="relative">
                  <AtSign className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    placeholder="e.g. mayachen"
                    maxLength={25}
                    className="w-full pl-9 pr-3 py-2.5 rounded-2xl border border-[#E8CBD3] dark:border-[#452037] bg-white dark:bg-[#281324] text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#8F1238]"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-9 pr-3 py-2.5 rounded-2xl border border-[#E8CBD3] dark:border-[#452037] bg-white dark:bg-[#281324] text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#8F1238]"
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider">
                  Password
                </label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-[11px] font-semibold text-[#8F1238] dark:text-[#E04D71] hover:underline"
                  >
                    Forgot?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  className="w-full pl-9 pr-3 py-2.5 rounded-2xl border border-[#E8CBD3] dark:border-[#452037] bg-white dark:bg-[#281324] text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#8F1238]"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-2xl bg-cherry-gradient text-white text-xs font-bold shadow-md hover:opacity-95 active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : mode === 'signin' ? (
              <>
                Sign In to Convora
                <ArrowRight className="w-4 h-4" />
              </>
            ) : mode === 'signup' ? (
              <>
                Create Convora Account
                <Sparkles className="w-4 h-4" />
              </>
            ) : (
              'Send Reset Link'
            )}
          </button>
        </form>

        {mode === 'forgot' && (
          <div className="text-center mt-4">
            <button
              type="button"
              onClick={() => { setMode('signin'); setError(null); }}
              className="text-xs font-semibold text-[#8F1238] dark:text-[#E04D71] hover:underline"
            >
              Back to Sign In
            </button>
          </div>
        )}

        {/* Quick Demo Helper Box */}
        <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 text-center">
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-2.5 font-semibold">
            ⚡ Quick Test Credentials (User 1 & User 2)
          </p>
          <div className="grid grid-cols-2 gap-2 mb-2.5">
            <button
              type="button"
              onClick={() => handleTestUserLogin(1)}
              disabled={loading}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-cherry-gradient hover:opacity-95 text-white text-xs font-bold shadow-sm transition-all active:scale-95 disabled:opacity-50"
              title="Sign in as Alex Cherry (@alex) with dedicated Firebase UID"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>Sign In User 1 (@alex)</span>
            </button>
            <button
              type="button"
              onClick={() => handleTestUserLogin(2)}
              disabled={loading}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#5C102A] hover:bg-[#731435] text-white text-xs font-bold shadow-sm transition-all active:scale-95 disabled:opacity-50"
              title="Sign in as Sam Blossom (@sam) with dedicated Firebase UID"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>Sign In User 2 (@sam)</span>
            </button>
          </div>

          <div className="flex items-center justify-center gap-2 text-[10px] text-zinc-400">
            <span>Prefill inputs instead:</span>
            <button
              type="button"
              onClick={() => { setMode('signin'); fillTestAccount(1); }}
              className="hover:underline text-[#8F1238] dark:text-[#E04D71]"
            >
              User 1
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => { setMode('signin'); fillTestAccount(2); }}
              className="hover:underline text-[#8F1238] dark:text-[#E04D71]"
            >
              User 2
            </button>
          </div>
          <p className="text-[10px] text-zinc-400 mt-1.5">
            Tip: Open an incognito window or 2nd device to log into User 2 simultaneously.
          </p>
        </div>

      </div>
    </div>
  );
};
