const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID as string;
const REDIRECT_URI = import.meta.env.VITE_SPOTIFY_REDIRECT_URI as string;

const SCOPES = [
  'streaming',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'playlist-read-private',
  'playlist-read-collaborative',
].join(' ');

// ── PKCE helpers ──────────────────────────────────────────────

function generateRandomString(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('').slice(0, length);
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return crypto.subtle.digest('SHA-256', data);
}

function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let str = '';
  bytes.forEach((b) => { str += String.fromCharCode(b); });
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export async function generatePKCE(): Promise<{ verifier: string; challenge: string }> {
  const verifier = generateRandomString(64);
  const hashed = await sha256(verifier);
  const challenge = base64UrlEncode(hashed);
  return { verifier, challenge };
}

// ── Auth URL ──────────────────────────────────────────────────

export async function getSpotifyAuthUrl(): Promise<string> {
  const { verifier, challenge } = await generatePKCE();
  const state = generateRandomString(16);

  sessionStorage.setItem('spotify_code_verifier', verifier);
  sessionStorage.setItem('spotify_auth_state', state);

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    state,
    scope: SCOPES,
  });

  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

// ── Token types ───────────────────────────────────────────────

export interface SpotifyTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number; // timestamp ms
}

// ── Token exchange ────────────────────────────────────────────

export async function exchangeCodeForTokens(code: string, state: string): Promise<SpotifyTokens> {
  const storedState = sessionStorage.getItem('spotify_auth_state');
  const verifier = sessionStorage.getItem('spotify_code_verifier');

  if (state !== storedState) throw new Error('State mismatch — possible CSRF attack');
  if (!verifier) throw new Error('No code verifier found');

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      code_verifier: verifier,
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error_description ?? 'Token exchange failed');
  }

  const data = await response.json();
  sessionStorage.removeItem('spotify_code_verifier');
  sessionStorage.removeItem('spotify_auth_state');

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
    expires_at: Date.now() + (data.expires_in - 60) * 1000, // 1-min buffer
  };
}

// ── Token refresh ─────────────────────────────────────────────

export async function refreshAccessToken(refreshToken: string): Promise<SpotifyTokens> {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error_description ?? 'Token refresh failed');
  }

  const data = await response.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? refreshToken,
    expires_in: data.expires_in,
    expires_at: Date.now() + (data.expires_in - 60) * 1000,
  };
}

// ── In-memory token cache ─────────────────────────────────────

let cachedTokens: SpotifyTokens | null = null;
let refreshPromise: Promise<SpotifyTokens> | null = null;

export function setCachedTokens(tokens: SpotifyTokens) {
  cachedTokens = tokens;
}

export async function getValidAccessToken(
  getRefreshToken: () => Promise<string | null>,
  onNewTokens: (tokens: SpotifyTokens) => Promise<void>
): Promise<string | null> {
  if (cachedTokens && Date.now() < cachedTokens.expires_at) {
    return cachedTokens.access_token;
  }

  if (refreshPromise) {
    const tokens = await refreshPromise;
    return tokens.access_token;
  }

  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  refreshPromise = refreshAccessToken(refreshToken)
    .then(async (tokens) => {
      cachedTokens = tokens;
      await onNewTokens(tokens);
      return tokens;
    })
    .finally(() => { refreshPromise = null; });

  const tokens = await refreshPromise;
  return tokens.access_token;
}

// ── Playlist metadata ─────────────────────────────────────────

export interface SpotifyPlaylistMeta {
  id: string;
  name: string;
  uri: string;
  image_url: string;
  track_count: number;
}

export function extractPlaylistId(url: string): string | null {
  const urlMatch = url.match(/playlist\/([a-zA-Z0-9]+)/);
  if (urlMatch) return urlMatch[1];
  const uriMatch = url.match(/playlist:([a-zA-Z0-9]+)/);
  if (uriMatch) return uriMatch[1];
  return null;
}

export async function fetchPlaylistMeta(playlistId: string, accessToken: string): Promise<SpotifyPlaylistMeta> {
  const response = await fetch(
    `https://api.spotify.com/v1/playlists/${playlistId}?fields=id,name,uri,images,tracks.total`,
    { headers: { 'Authorization': `Bearer ${accessToken}` } }
  );

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message ?? 'Failed to fetch playlist');
  }

  const data = await response.json();
  return {
    id: data.id,
    name: data.name,
    uri: data.uri,
    image_url: data.images?.[0]?.url ?? '',
    track_count: data.tracks?.total ?? 0,
  };
}

// ── Playback control ──────────────────────────────────────────

export async function playSpotifyPlaylist(playlistUri: string, deviceId: string, accessToken: string): Promise<void> {
  const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ context_uri: playlistUri }),
  });

  if (!response.ok && response.status !== 204) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { error?: { message?: string } }).error?.message ?? 'Failed to start playback');
  }
}

export async function pauseSpotifyPlayback(deviceId: string, accessToken: string): Promise<void> {
  await fetch(`https://api.spotify.com/v1/me/player/pause?device_id=${deviceId}`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
}

export async function resumeSpotifyPlayback(deviceId: string, accessToken: string): Promise<void> {
  await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
}
