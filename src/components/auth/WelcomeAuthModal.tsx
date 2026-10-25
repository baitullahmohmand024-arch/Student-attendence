import React, { useState } from 'react';
import {
  School,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  X,
  Cloud,
  ChevronRight
} from 'lucide-react';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from '../../services/firebase';

interface WelcomeAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated: (user: any) => void;
  onContinueOffline: () => void;
}

export const WelcomeAuthModal: React.FC<WelcomeAuthModalProps> = ({
  isOpen,
  onClose,
  onAuthenticated,
  onContinueOffline,
}) => {
  const [authMode, setAuthMode] = useState<'welcome' | 'email_signin' | 'email_register'>('welcome');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        onAuthenticated(result.user);
        onClose();
      }
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setErrorMessage('Sign-in cancelled. Please try again.');
      } else if (err.code === 'auth/network-request-failed') {
        setErrorMessage('Network connection lost. You can continue offline.');
      } else {
        setErrorMessage(err.message || 'Google sign-in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      if (authMode === 'email_register') {
        if (password.length < 6) {
          setErrorMessage('Password must be at least 6 characters.');
          setLoading(false);
          return;
        }
        const result = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        onAuthenticated(result.user);
      } else {
        const result = await signInWithEmailAndPassword(auth, cleanEmail, password);
        onAuthenticated(result.user);
      }
      onClose();
    } catch (err: any) {
      console.error('Email auth error:', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setErrorMessage('Invalid email or password.');
      } else if (err.code === 'auth/email-already-in-use') {
        setErrorMessage('An account with this email already exists. Tap "Sign In" instead.');
      } else {
        setErrorMessage(err.message || 'Authentication failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 max-w-sm w-full p-6 shadow-2xl relative space-y-5 animate-in zoom-in-95 duration-200">
        
        {/* Close Button if user wants to dismiss */}
        <button
          onClick={onContinueOffline}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          title="Continue Offline"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="text-center space-y-2 pt-2">
          <div className="w-16 h-16 rounded-3xl bg-[#0B192C] mx-auto flex items-center justify-center text-emerald-400 shadow-xl border border-slate-800">
            <School className="w-9 h-9" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            SchoolSync
          </h2>
          <p className="text-xs text-slate-500 font-medium max-w-[270px] mx-auto leading-relaxed">
            Sign in with your <strong>Gmail / Google</strong> account for secure cloud backup and multi-device restoration.
          </p>
        </div>

        {/* Error Notice */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-300 rounded-2xl text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold flex-1 leading-snug">{errorMessage}</span>
          </div>
        )}

        {/* VIEW 1: WELCOME SCREEN (Main Options) */}
        {authMode === 'welcome' && (
          <div className="space-y-3 pt-1">
            
            {/* 1. Continue with Gmail / Google Button */}
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-4 px-4 bg-white hover:bg-slate-50 active:scale-[0.99] border-2 border-slate-300 hover:border-slate-400 rounded-2xl text-slate-900 font-extrabold text-sm shadow-sm transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 group"
            >
              <svg className="w-5 h-5 group-hover:scale-105 transition-transform shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{loading ? 'Connecting Google Account...' : 'Sign in with Gmail / Google'}</span>
            </button>

            <div className="relative flex items-center justify-center my-3">
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-white px-2 text-[10px] uppercase font-bold tracking-wider text-slate-400 absolute">
                or email
              </span>
            </div>

            {/* 2. Sign in with Email / Create Account */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setAuthMode('email_signin')}
                className="py-3 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                <Mail className="w-3.5 h-3.5 text-slate-600" />
                <span>Sign In</span>
              </button>

              <button
                onClick={() => setAuthMode('email_register')}
                className="py-3 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Create Account</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 3. Continue Offline Button */}
            <div className="pt-2">
              <button
                onClick={onContinueOffline}
                className="w-full py-2.5 text-xs text-slate-500 hover:text-slate-800 font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Continue Offline without Cloud Sync</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>
        )}

        {/* VIEW 2: EMAIL SIGN IN OR REGISTER FORM */}
        {(authMode === 'email_signin' || authMode === 'email_register') && (
          <form onSubmit={handleEmailAuth} className="space-y-3 pt-1">
            <div className="flex items-center justify-between pb-1">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                {authMode === 'email_signin' ? 'Sign In with Email' : 'Create New Account'}
              </h3>
              <button
                type="button"
                onClick={() => setAuthMode('welcome')}
                className="text-[11px] text-emerald-700 hover:underline font-bold"
              >
                ← Back
              </button>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teacher@school.edu"
                className="w-full p-3 text-xs bg-slate-50 rounded-xl border border-slate-300 focus:outline-none focus:border-slate-900 focus:bg-white font-medium"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-3 text-xs bg-slate-50 rounded-xl border border-slate-300 focus:outline-none focus:border-slate-900 focus:bg-white font-medium"
              />
            </div>

            <div className="pt-2 space-y-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-slate-950 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <span>Processing...</span>
                ) : (
                  <span>{authMode === 'email_signin' ? 'Sign In to Account' : 'Register Account'}</span>
                )}
              </button>

              <div className="text-center pt-1">
                {authMode === 'email_signin' ? (
                  <button
                    type="button"
                    onClick={() => setAuthMode('email_register')}
                    className="text-xs text-slate-500 hover:text-slate-800"
                  >
                    Need an account? <strong className="text-emerald-700">Create one</strong>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAuthMode('email_signin')}
                    className="text-xs text-slate-500 hover:text-slate-800"
                  >
                    Already have an account? <strong className="text-emerald-700">Sign in</strong>
                  </button>
                )}
              </div>
            </div>
          </form>
        )}

        {/* Security Assurance Footer */}
        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-[10px] text-slate-500 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>OAuth Google Identity & encrypted zero-trust cloud backup.</span>
        </div>

      </div>
    </div>
  );
};
