import { useEffect, useRef, useState } from 'react';

const LOCKOUT_KEY = 'pin_failed_attempts';
const LOCKOUT_TIME_KEY = 'pin_lockout_until';
const AUTH_KEY = 'pin_authenticated';
const MAX_ATTEMPTS = 15;
const LOCKOUT_DURATION_MS = 60 * 60 * 1000;

interface PinGateProps {
  correctPin: string;
  onAuthenticated: () => void;
}

export function PinGate({ correctPin, onAuthenticated }: PinGateProps) {
  const [digits, setDigits] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [lockedOut, setLockedOut] = useState(false);
  const [countdown, setCountdown] = useState('');
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

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
    if (until > Date.now()) setLockedOut(true);
  }

  function handleDigit(index: number, value: string) {
    if (!/^\d?$/.test(value)) return;
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    setError('');
    if (value && index < 3) inputRefs[index + 1].current?.focus();
    if (value && index === 3 && next.join('').length === 4) submit(next.join(''));
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
        setError(`Wrong PIN · ${MAX_ATTEMPTS - attempts} attempts left`);
        setDigits(['', '', '', '']);
        setTimeout(() => inputRefs[0].current?.focus(), 50);
      }
    }
  }

  if (lockedOut) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#17110C' }}
      >
        <div className="text-center space-y-4">
          <p style={{ color: '#534840', fontFamily: 'var(--font-mono)', fontSize: '2rem' }}>🔒</p>
          <p style={{ fontFamily: 'var(--font-display)', color: '#F0E6D3', fontSize: '1.1rem', fontWeight: 600 }}>
            Too many attempts
          </p>
          <p style={{ color: '#534840', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
            Try again in
          </p>
          <p style={{ fontFamily: 'var(--font-display)', color: '#E4A530', fontSize: '2.5rem', fontWeight: 600 }}>
            {countdown}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ backgroundColor: '#17110C' }}
    >
      <div className="text-center space-y-10">
        <div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              color: '#E4A530',
              fontSize: '1.8rem',
              fontWeight: 700,
              letterSpacing: '-0.01em',
            }}
          >
            Culture Works
          </h1>
          <p
            className="mt-2 tracking-widest uppercase"
            style={{ color: '#534840', fontFamily: 'var(--font-mono)', fontSize: '0.65rem' }}
          >
            Music Scheduler
          </p>
        </div>

        <div className="space-y-4">
          <p style={{ color: '#8A7D6B', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
            Enter PIN
          </p>
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
                className="text-center rounded-xl text-xl"
                style={{
                  width: '52px', height: '60px',
                  backgroundColor: '#1F1710',
                  border: error ? '1.5px solid #E0575755' : '1.5px solid #2E2317',
                  color: '#F0E6D3',
                  fontFamily: 'var(--font-display)',
                  outline: 'none',
                  transition: 'border-color 0.15s',
                }}
                onFocus={(e) => { e.target.style.borderColor = '#E4A530'; }}
                onBlur={(e) => { e.target.style.borderColor = error ? '#E0575755' : '#2E2317'; }}
              />
            ))}
          </div>
          {error && (
            <p style={{ color: '#E05757', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
              {error}
            </p>
          )}
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
