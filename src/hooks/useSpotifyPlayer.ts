import { useEffect, useRef, useState, useCallback } from 'react';
import { ref, set, get } from 'firebase/database';
import { db } from '../lib/firebase';
import {
  getValidAccessToken,
  playSpotifyPlaylist,
  pauseSpotifyPlayback,
  resumeSpotifyPlayback,
  setCachedTokens,
  type SpotifyTokens,
} from '../lib/spotify';

// ── Minimal Spotify Web Playback SDK types ─────────────────────
interface SpotifyTrack {
  name: string;
  artists: Array<{ name: string }>;
  album: { images: Array<{ url: string }> };
}

interface SpotifyPlayerState {
  track_window: { current_track: SpotifyTrack };
  paused: boolean;
}

interface SpotifyPlayerInstance {
  connect(): Promise<boolean>;
  disconnect(): void;
  addListener(event: 'ready', cb: (data: { device_id: string }) => void): void;
  addListener(event: 'not_ready', cb: (data: { device_id: string }) => void): void;
  addListener(event: 'player_state_changed', cb: (state: SpotifyPlayerState | null) => void): void;
  addListener(event: 'initialization_error', cb: (data: { message: string }) => void): void;
  addListener(event: 'authentication_error', cb: (data: { message: string }) => void): void;
  addListener(event: 'account_error', cb: (data: { message: string }) => void): void;
  setVolume(volume: number): Promise<void>;
}

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady: () => void;
    Spotify: {
      Player: new (options: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume?: number;
      }) => SpotifyPlayerInstance;
    };
  }
}

// ── Hook ──────────────────────────────────────────────────────

export interface SpotifyPlayerHookState {
  isReady: boolean;
  deviceId: string | null;
  currentTrack: { name: string; artist: string; albumArt: string } | null;
  error: string | null;
}

export function useSpotifyPlayer(enabled: boolean) {
  const playerRef = useRef<SpotifyPlayerInstance | null>(null);
  const deviceIdRef = useRef<string | null>(null);
  const [state, setState] = useState<SpotifyPlayerHookState>({
    isReady: false,
    deviceId: null,
    currentTrack: null,
    error: null,
  });

  async function getRefreshToken(): Promise<string | null> {
    const snap = await get(ref(db, 'settings/spotify_refresh_token'));
    return snap.val() as string | null;
  }

  async function onNewTokens(tokens: SpotifyTokens): Promise<void> {
    await set(ref(db, 'settings/spotify_refresh_token'), tokens.refresh_token);
    setCachedTokens(tokens);
  }

  const getToken = useCallback(async () => {
    return getValidAccessToken(getRefreshToken, onNewTokens);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    function initPlayer() {
      const player = new window.Spotify.Player({
        name: 'Culture Works Music',
        getOAuthToken: async (cb) => {
          const token = await getToken();
          if (token) cb(token);
        },
        volume: 0.7,
      });

      player.addListener('ready', ({ device_id }) => {
        deviceIdRef.current = device_id;
        setState((s) => ({ ...s, isReady: true, deviceId: device_id, error: null }));
      });

      player.addListener('not_ready', () => {
        setState((s) => ({ ...s, isReady: false }));
      });

      player.addListener('player_state_changed', (playerState) => {
        if (!playerState) return;
        const track = playerState.track_window.current_track;
        if (track) {
          setState((s) => ({
            ...s,
            currentTrack: {
              name: track.name,
              artist: track.artists.map((a) => a.name).join(', '),
              albumArt: track.album.images[0]?.url ?? '',
            },
          }));
        }
      });

      player.addListener('initialization_error', ({ message }) => {
        setState((s) => ({ ...s, error: message }));
      });

      player.addListener('authentication_error', ({ message }) => {
        setState((s) => ({ ...s, error: message, isReady: false }));
      });

      player.addListener('account_error', ({ message }) => {
        setState((s) => ({ ...s, error: message }));
      });

      player.connect();
      playerRef.current = player;
    }

    if (window.Spotify) {
      initPlayer();
    } else {
      window.onSpotifyWebPlaybackSDKReady = initPlayer;
    }

    return () => {
      playerRef.current?.disconnect();
      playerRef.current = null;
    };
  }, [enabled, getToken]);

  async function playPlaylist(uri: string): Promise<void> {
    const deviceId = deviceIdRef.current;
    if (!deviceId) throw new Error('Spotify player not ready');
    const token = await getToken();
    if (!token) throw new Error('No Spotify token');
    await playSpotifyPlaylist(uri, deviceId, token);
  }

  async function pause(): Promise<void> {
    const deviceId = deviceIdRef.current;
    if (!deviceId) return;
    const token = await getToken();
    if (!token) return;
    await pauseSpotifyPlayback(deviceId, token);
  }

  async function resume(): Promise<void> {
    const deviceId = deviceIdRef.current;
    if (!deviceId) return;
    const token = await getToken();
    if (!token) return;
    await resumeSpotifyPlayback(deviceId, token);
  }

  function setVolume(volume: number) {
    playerRef.current?.setVolume(volume / 100);
  }

  return { state, playPlaylist, pause, resume, setVolume };
}
