import { useEffect, useRef, useState } from 'react';

const LOCKOUT_KEY = 'pin_failed_attempts';
const LOCKOUT_TIME_KEY = 'pin_lockout_until';
const AUTH_KEY = 'pin_authenticated';
const MAX_ATTEMPTS = 15;
const LOCKOUT_DURATION_MS = 60 * 60 * 1000; // 1 hour

interface PinGateProps {
  correctPin: string;
  onAuthenticated: () => void;
}

export function PinGate({ correctPin, onAuthenticated }: PinGateProps) {
  const [digits, setDigits] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [lockedOut, setLockedOut] = useState(false);
  const [countdown, setCountdown] = useState('');
  const inputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  useEffect(() => {
    checkLockout();
    inputRefs[0].current?.focus();
  }, []);

  useEffect(() => {
    if (!lockedOut) return;
    const interval = setInterval(() => {
      const until = parseInt(localStorage.getItem(LOCKOUT_TIME_KEY) || '0');
      const remaining = until - Date.now();
      if (remaining <= 0) {
        setLockedOut(false);
        localStorage.removeItem(LOCKOUT_TIME_KEY);
        localStorage.removeItem(LOCKOUT_KEY);
        clearInterval(interval);
      } else {
        const mins = Math.floor(remaining / 60000);
        const secs = Math.floor((remaining % 60000) / 1000);
        setCountdown(`${mins}:${String(secs).padStart(2, '0')}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockedOut]);

  function checkLockout() {
    const until = parseInt(localStorage.getItem(LOCKOUT_TIME_KEY) || '0');
    if (until > Date.now()) {
      setLockedOut(true);
    }
  }

  function handleDigit(index: number, value: string) {
    if (!/^\d?$/.test(value)) return;
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    setError('');

    if (value && index < 3) {
      inputRefs[index + 1].current?.focus();
    }

    if (value && index === 3) {
      const pin = next.join('');
      if (pin.length === 4) submit(pin);
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  }

  function submit(pin: string) {
    if (pin === correctPin) {
      localStorage.removeItem(LOCKOUT_KEY);
      localStorage.removeItem(LOCKOUT_TIME_KEY);
      localStorage.setItem(AUTH_KEY, 'true');
      onAuthenticated();
    } else {
      const attempts = parseInt(localStorage.getItem(LOCKOUT_KEY) || '0') + 1;
      localStorage.setItem(LOCKOUT_KEY, String(attempts));
      if (attempts >= MAX_ATTEMPTS) {
        const until = Date.now() + LOCKOUT_DURATION_MS;
        localStorage.setItem(LOCKOUT_TIME_KEY, String(until));
        setLockedOut(true);
      } else {
        setError(`Incorrect PIN. ${MAX_ATTEMPTS - attempts} attempts remaining.`);
        setDigits(['', '', '', '']);
        setTimeout(() => inputRefs[0].current?.focus(), 50);
      }
    }
  }

  if (lockedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app-bg">
        <div className="text-center space-y-4">
          <div className="text-6xl mb-6">🔒</div>
          <h2 className="text-2xl font-mono font-bold text-amber-400">Too Many Attempts</h2>
          <p className="text-gray-400">Try again in</p>
          <p className="text-4xl font-mono text-amber-400">{countdown}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-app-bg">
      <div className="text-center space-y-8 p-8">
        <div>
          <h1 className="text-3xl font-mono font-bold text-amber-400 tracking-wider">CULTURE WORKS</h1>
          <p className="text-gray-400 mt-2 text-sm tracking-widest uppercase">Music Scheduler</p>
        </div>

        <div className="space-y-3">
          <p className="text-gray-300 text-sm tracking-wide">Enter PIN to manage the schedule</p>
          <div className="flex gap-3 justify-center">
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={inputRefs[i]}
                type="password"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigit(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="w-14 h-16 text-center text-2xl font-mono bg-gray-800 border-2 border-gray-600 rounded-lg text-white focus:border-amber-400 focus:outline-none transition-colors"
              />
            ))}
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>
      </div>
    </div>
  );
}

export function checkPinAuth(): boolean {
  return localStorage.getItem(AUTH_KEY) === 'true';
}

export function clearPinAuth() {
  localStorage.removeItem(AUTH_KEY);
}
