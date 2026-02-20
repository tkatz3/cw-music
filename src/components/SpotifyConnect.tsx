import { ref, set } from 'firebase/database';
import { db } from '../lib/firebase';
import { getSpotifyAuthUrl } from '../lib/spotify';
import type { Settings } from '../hooks/useSettings';

const SPOTIFY_GREEN = '#1DB954';

interface SpotifyConnectProps {
  settings: Settings;
}

export function SpotifyConnect({ settings }: SpotifyConnectProps) {
  async function handleConnect() {
    const url = await getSpotifyAuthUrl();
    window.location.href = url;
  }

  async function handleDisconnect() {
    await set(ref(db, 'settings/spotify_refresh_token'), null);
    await set(ref(db, 'settings/spotify_connected'), false);
  }

  if (settings.spotify_connected && settings.spotify_refresh_token) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: SPOTIFY_GREEN }} />
        <span style={{ color: '#8A7D6B', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
          Spotify connected
        </span>
        <button
          onClick={handleDisconnect}
          style={{ color: '#534840', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', marginLeft: '4px' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#E05757'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#534840'; }}
        >
          disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg w-full transition-all"
      style={{
        backgroundColor: `${SPOTIFY_GREEN}18`,
        border: `1px solid ${SPOTIFY_GREEN}44`,
        color: SPOTIFY_GREEN,
        fontFamily: 'var(--font-mono)',
        fontSize: '0.8rem',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = `${SPOTIFY_GREEN}28`; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = `${SPOTIFY_GREEN}18`; }}
    >
      Connect Spotify
    </button>
  );
}
