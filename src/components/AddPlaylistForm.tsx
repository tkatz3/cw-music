import { useState } from 'react';
import { ref, get, set } from 'firebase/database';
import { db } from '../lib/firebase';
import {
  extractPlaylistId,
  fetchPlaylistMeta,
  getValidAccessToken,
  setCachedTokens,
  type SpotifyTokens,
} from '../lib/spotify';
import type { SpotifyPlaylistRecord } from '../lib/stations';

const SPOTIFY_GREEN = '#1DB954';

interface AddPlaylistFormProps {
  onAdd: (playlist: SpotifyPlaylistRecord) => Promise<void>;
  onClose: () => void;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  backgroundColor: '#17110C',
  border: '1px solid #2E2317',
  borderRadius: '8px',
  padding: '8px 12px',
  color: '#F0E6D3',
  fontFamily: 'var(--font-mono)',
  fontSize: '0.75rem',
  outline: 'none',
};

export function AddPlaylistForm({ onAdd, onClose }: AddPlaylistFormProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function getRefreshToken(): Promise<string | null> {
    const snap = await get(ref(db, 'settings/spotify_refresh_token'));
    return snap.val() as string | null;
  }

  async function onNewTokens(tokens: SpotifyTokens): Promise<void> {
    await set(ref(db, 'settings/spotify_refresh_token'), tokens.refresh_token);
    setCachedTokens(tokens);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const id = extractPlaylistId(url.trim());
      if (!id) {
        setError('Invalid Spotify playlist URL or URI');
        return;
      }

      const token = await getValidAccessToken(getRefreshToken, onNewTokens);
      if (!token) {
        setError('Spotify not connected — connect it in Settings first.');
        return;
      }

      const meta = await fetchPlaylistMeta(id, token);
      await onAdd(meta);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch playlist');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(12, 8, 4, 0.85)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl p-5 flex flex-col gap-4 shadow-2xl animate-slide-up"
        style={{ backgroundColor: '#1F1710', border: '1px solid #3A2F20' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 style={{ fontFamily: 'var(--font-display)', color: '#F0E6D3', fontSize: '1rem', fontWeight: 600 }}>
            Add Spotify Playlist
          </h3>
          <button
            onClick={onClose}
            style={{ color: '#534840', fontSize: '1.2rem', lineHeight: 1 }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#F0E6D3'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#534840'; }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label style={{ fontSize: '0.65rem', color: '#8A7D6B', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: '6px' }}>
              Playlist URL
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://open.spotify.com/playlist/…"
              style={inputStyle}
              onFocus={(e) => { e.target.style.borderColor = SPOTIFY_GREEN; }}
              onBlur={(e) => { e.target.style.borderColor = '#2E2317'; }}
              autoFocus
            />
          </div>

          {error && (
            <p style={{ color: '#E05757', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor: loading || !url.trim() ? '#2E2317' : SPOTIFY_GREEN,
              color: loading || !url.trim() ? '#534840' : '#000',
              fontFamily: 'var(--font-mono)',
              cursor: loading || !url.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Fetching…' : 'Add Playlist'}
          </button>
        </form>
      </div>
    </div>
  );
}
