import React, { useState, useEffect } from 'react';
import {
  Lock,
  Unlock,
  AlertCircle,
  Clock,
  RotateCcw,
  CheckCircle2,
  KeyRound,
  ShieldAlert
} from 'lucide-react';
import { pinLockService } from '../../services/pinLockService';
import { auth, googleProvider, signInWithPopup } from '../../services/firebase';

interface PinLockModalProps {
  isOpen: boolean;
  onUnlocked: () => void;
}

export const PinLockModal: React.FC<PinLockModalProps> = ({
  isOpen,
  onUnlocked,
}) => {
  const [pin, setPin] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // Check initial lockout
  useEffect(() => {
    if (!isOpen) return;
    const remaining = pinLockService.getRemainingLockoutSeconds();
    if (remaining > 0) {
      setLockoutSeconds(remaining);
    }
  }, [isOpen]);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setErrorMessage(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutSeconds]);

  if (!isOpen) return null;

  const handleKeyPress = (digit: string) => {
    if (lockoutSeconds > 0) return;
    if (pin.length < 8) {
      const next = pin + digit;
      setPin(next);
      setErrorMessage(null);
      if (next.length >= 4) {
        // Auto-check PIN when 4 or more digits entered
        verifyPinInput(next);
      }
    }
  };

  const handleBackspace = () => {
    if (lockoutSeconds > 0) return;
    setPin((prev) => prev.slice(0, -1));
    setErrorMessage(null);
  };

  const verifyPinInput = async (pinToCheck: string) => {
    setVerifying(true);
    try {
      const result = await pinLockService.verifyPin(pinToCheck);
      if (result.success) {
        setPin('');
        onUnlocked();
      } else {
        if (result.lockoutSeconds) {
          setLockoutSeconds(result.lockoutSeconds);
          setErrorMessage(`Too many incorrect attempts. Locked for ${result.lockoutSeconds} seconds.`);
        } else {
          setErrorMessage('Incorrect PIN. Please try again.');
        }
        setPin('');
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleForgotPinWithGoogle = async () => {
    try {
      setVerifying(true);
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        // Verified account owner! Reset PIN lock
        pinLockService.resetPinAfterAccountVerification();
        onUnlocked();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Google account verification failed.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 p-4">
      <div className="bg-white rounded-3xl border border-slate-200 max-w-xs w-full p-6 shadow-2xl space-y-5 text-center animate-in zoom-in-95 duration-150">
        
        {/* Header Icon */}
        <div className="w-14 h-14 rounded-2xl bg-[#0B192C] flex items-center justify-center mx-auto text-emerald-400 shadow-lg">
          <Lock className="w-7 h-7" />
        </div>

        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            SchoolSync Locked
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Enter your secret PIN to access school attendance.
          </p>
        </div>

        {/* Lockout Notice */}
        {lockoutSeconds > 0 ? (
          <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl text-amber-900 text-xs flex items-center justify-center gap-2">
            <Clock className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" />
            <span className="font-bold">Wait {lockoutSeconds}s before retry</span>
          </div>
        ) : errorMessage ? (
          <div className="p-2.5 bg-rose-50 border border-rose-300 rounded-xl text-rose-800 text-xs font-semibold">
            {errorMessage}
          </div>
        ) : null}

        {/* PIN Dots Indicator */}
        <div className="flex items-center justify-center gap-3 py-2">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-4 h-4 rounded-full border-2 transition-all ${
                pin.length > idx
                  ? 'bg-slate-900 border-slate-900 scale-110'
                  : 'bg-slate-100 border-slate-300'
              }`}
            />
          ))}
        </div>

        {/* Touch Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2.5 pt-1">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              disabled={lockoutSeconds > 0 || verifying}
              onClick={() => handleKeyPress(digit)}
              className="h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-900 font-bold text-lg transition-all cursor-pointer disabled:opacity-40"
            >
              {digit}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setPin('')}
            className="h-12 rounded-2xl text-slate-400 hover:text-slate-600 text-xs font-semibold flex items-center justify-center"
          >
            Clear
          </button>

          <button
            type="button"
            disabled={lockoutSeconds > 0 || verifying}
            onClick={() => handleKeyPress('0')}
            className="h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-900 font-bold text-lg transition-all cursor-pointer disabled:opacity-40"
          >
            0
          </button>

          <button
            type="button"
            onClick={handleBackspace}
            className="h-12 rounded-2xl text-slate-700 hover:bg-slate-100 flex items-center justify-center text-sm font-bold"
          >
            ⌫
          </button>
        </div>

        {/* Forgot PIN Recovery Option */}
        <div className="pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={handleForgotPinWithGoogle}
            className="text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center justify-center gap-1.5 mx-auto"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Forgot PIN? Verify with Google</span>
          </button>
        </div>

      </div>
    </div>
  );
};
