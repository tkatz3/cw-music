import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, set } from 'firebase/database';
import { db } from '../lib/firebase';
import { exchangeCodeForTokens, setCachedTokens } from '../lib/spotify';

export function SpotifyCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleCallback() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');
      const errorParam = params.get('error');

      if (errorParam) {
        setError(`Spotify login failed: ${errorParam}`);
        return;
      }

      if (!code || !state) {
        setError('Missing code or state from Spotify');
        return;
      }

      try {
        const tokens = await exchangeCodeForTokens(code, state);
        setCachedTokens(tokens);
        await set(ref(db, 'settings/spotify_refresh_token'), tokens.refresh_token);
        await set(ref(db, 'settings/spotify_connected'), true);
        navigate('/');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    }

    handleCallback();
  }, [navigate]);

  if (error) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-4"
        style={{ backgroundColor: '#17110C' }}
      >
        <p style={{ color: '#E05757', fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>
          Spotify connection failed
        </p>
        <p style={{ color: '#534840', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
          {error}
        </p>
        <a
          href="/"
          style={{ color: '#E4A530', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', marginTop: '8px' }}
        >
          ← Back to scheduler
        </a>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: '#17110C' }}
    >
      <p
        className="animate-pulse"
        style={{ color: '#8A7D6B', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
      >
        Connecting Spotify…
      </p>
    </div>
  );
}
