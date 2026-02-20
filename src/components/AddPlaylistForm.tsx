import { useState, useEffect, useMemo, useRef } from 'react';
import { ref, get, set } from 'firebase/database';
import { db } from '../lib/firebase';
import {
  fetchUserPlaylists,
  searchSpotifyPlaylists,
  fetchPlaylistDetails,
  getValidAccessToken,
  setCachedTokens,
  type SpotifyPlaylistMeta,
  type SpotifySearchResult,
  type SpotifyTokens,
} from '../lib/spotify';
import type { SpotifyPlaylistRecord } from '../lib/stations';

const SPOTIFY_GREEN = '#1DB954';

interface AddPlaylistFormProps {
  onAdd: (playlist: SpotifyPlaylistRecord) => Promise<void>;
  onClose: () => void;
}

async function getFirebaseRefreshToken(): Promise<string | null> {
  const snap = await get(ref(db, 'settings/spotify_refresh_token'));
  return snap.val() as string | null;
}
async function onNewTokens(tokens: SpotifyTokens): Promise<void> {
  await set(ref(db, 'settings/spotify_refresh_token'), tokens.refresh_token);
  setCachedTokens(tokens);
}

async function getToken(): Promise<string | null> {
  return getValidAccessToken(getFirebaseRefreshToken, onNewTokens);
}

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return n.toString();
}

interface PlaylistDetails { follower_count: number; track_count: number }
type Row = SpotifyPlaylistMeta | SpotifySearchResult;

export function AddPlaylistForm({ onAdd, onClose }: AddPlaylistFormProps) {
  const [query, setQuery] = useState('');
  const [myPlaylists, setMyPlaylists] = useState<SpotifyPlaylistMeta[]>([]);
  const [searchResults, setSearchResults] = useState<SpotifySearchResult[]>([]);
  const [detailsMap, setDetailsMap] = useState<Map<string, PlaylistDetails>>(new Map());
  const [loadingLibrary, setLoadingLibrary] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load user's own playlists on open
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const token = await getToken();
        if (!token) { setError('Spotify not connected — connect it in Settings first.'); setLoadingLibrary(false); return; }
        const items = await fetchUserPlaylists(token);
        if (cancelled) return;
        setMyPlaylists(items);
        // Fetch track counts in background (sequential to avoid rate limits)
        (async () => {
          for (const pl of items) {
            if (cancelled) break;
            try {
              const tok = await getToken();
              if (!tok || cancelled) break;
              const details = await fetchPlaylistDetails(pl.id, tok);
              if (!cancelled) setDetailsMap((prev) => new Map(prev).set(pl.id, details));
            } catch {}
            await new Promise((r) => setTimeout(r, 150));
          }
        })();
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load playlists');
      } finally {
        if (!cancelled) setLoadingLibrary(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Debounced Spotify search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const q = query.trim();
    if (!q) { setSearchResults([]); setDetailsMap(new Map()); return; }

    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      setError(null);
      try {
        const token = await getToken();
        if (!token) { setError('Spotify not connected.'); setSearching(false); return; }
        const results = await searchSpotifyPlaylists(q, token);
        setSearchResults(results);
        setDetailsMap(new Map());
        // Fetch details in background (sequential to avoid rate limits)
        (async () => {
          for (const pl of results) {
            try {
              const tok = await getToken();
              if (!tok) break;
              const details = await fetchPlaylistDetails(pl.id, tok);
              setDetailsMap((prev) => new Map(prev).set(pl.id, details));
            } catch {}
            await new Promise((r) => setTimeout(r, 150));
          }
        })();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed');
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [query]);

  const isSearchMode = query.trim().length > 0;

  const filteredLibrary = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return myPlaylists;
    return myPlaylists.filter((p) => p.name.toLowerCase().includes(q));
  }, [myPlaylists, query]);

  async function handleAdd(pl: Row) {
    setAdding(pl.id);
    try {
      const details = detailsMap.get(pl.id);
      const record: SpotifyPlaylistRecord = {
        id: pl.id,
        name: pl.name,
        uri: pl.uri,
        image_url: pl.image_url,
        track_count: details?.track_count ?? pl.track_count,
      };
      await onAdd(record);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add');
      setAdding(null);
    }
  }

  const rows: Row[] = isSearchMode ? searchResults : filteredLibrary;
  const isLoading = isSearchMode ? searching : loadingLibrary;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(12, 8, 4, 0.88)' }}
      onClick={onClose}
    >
      <div
        className="w-full rounded-xl flex flex-col shadow-2xl"
        style={{
          backgroundColor: '#1A130D',
          border: '1px solid #3A2F20',
          maxWidth: '680px',
          maxHeight: '85vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid #2E2317' }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', color: '#F0E6D3', fontSize: '1.05rem', fontWeight: 600 }}>
              Add Spotify Playlist
            </h3>
            <p style={{ color: '#534840', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', marginTop: '2px' }}>
              {isSearchMode
                ? `Spotify search — ${searchResults.length} results`
                : `Your library — ${myPlaylists.length} playlists`}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ color: '#534840', fontSize: '1.3rem', lineHeight: 1 }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#F0E6D3'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#534840'; }}
          >
            ×
          </button>
        </div>

        {/* Search bar */}
        <div className="px-5 py-3 flex-shrink-0" style={{ borderBottom: '1px solid #2E2317' }}>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#534840' }}>
              {isSearchMode ? '🔍' : '♪'}
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search all of Spotify — or leave empty to browse your library"
              autoFocus
              style={{
                width: '100%',
                backgroundColor: '#17110C',
                border: '1px solid #2E2317',
                borderRadius: '8px',
                padding: '9px 32px 9px 32px',
                color: '#F0E6D3',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8rem',
                outline: 'none',
              }}
              onFocus={(e) => { e.target.style.borderColor = SPOTIFY_GREEN; }}
              onBlur={(e) => { e.target.style.borderColor = '#2E2317'; }}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-lg leading-none"
                style={{ color: '#534840' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#8A7D6B'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#534840'; }}
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="px-6 py-5 text-center">
              <p style={{ color: '#E05757', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{error}</p>
            </div>
          )}

          {!error && isLoading && (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm animate-pulse" style={{ color: '#534840', fontFamily: 'var(--font-mono)' }}>
                {isSearchMode ? 'Searching…' : 'Loading your library…'}
              </p>
            </div>
          )}

          {!error && !isLoading && rows.length === 0 && (
            <div className="flex items-center justify-center py-12">
              <p style={{ color: '#534840', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                {isSearchMode ? 'No results for that search' : 'No playlists in your library'}
              </p>
            </div>
          )}

          {!error && !isLoading && rows.map((pl) => {
            const ownerName = 'owner_name' in pl ? pl.owner_name : null;
            const isSpotifyOfficial = ownerName?.toLowerCase() === 'spotify';
            const details = detailsMap.get(pl.id);
            const trackCount = details?.track_count ?? pl.track_count;
            const followerCount = details?.follower_count;

            return (
              <button
                key={pl.id}
                onClick={() => handleAdd(pl)}
                disabled={adding === pl.id}
                className="w-full flex items-center gap-4 px-5 py-3.5 text-left transition-colors"
                style={{ borderBottom: '1px solid #1F1710', cursor: adding === pl.id ? 'wait' : 'pointer' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#21190E'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
              >
                {pl.image_url ? (
                  <img src={pl.image_url} alt="" className="flex-shrink-0 rounded-md" style={{ width: 46, height: 46, objectFit: 'cover' }} />
                ) : (
                  <div className="flex-shrink-0 rounded-md flex items-center justify-center text-base" style={{ width: 46, height: 46, backgroundColor: '#2E2317', color: SPOTIFY_GREEN }}>
                    ♪
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: '#F0E6D3', fontFamily: 'var(--font-mono)' }}>
                    {pl.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {isSearchMode && ownerName && (
                      <span className="text-[10px]" style={{ color: isSpotifyOfficial ? SPOTIFY_GREEN : '#534840', fontFamily: 'var(--font-mono)' }}>
                        {isSpotifyOfficial ? '✦ Spotify' : `by ${ownerName}`}
                      </span>
                    )}
                    <span className="text-[10px]" style={{ color: '#3A2F20', fontFamily: 'var(--font-mono)' }}>
                      {details
                        ? (trackCount > 0 ? `${trackCount} tracks` : '—')
                        : <span className="animate-pulse">…</span>}
                    </span>
                    {isSearchMode && followerCount !== undefined && followerCount > 0 && (
                      <span className="text-[10px]" style={{ color: '#534840', fontFamily: 'var(--font-mono)' }}>
                        · {formatFollowers(followerCount)} saves
                      </span>
                    )}
                  </div>
                </div>

                {adding === pl.id ? (
                  <span className="text-[10px] animate-pulse flex-shrink-0" style={{ color: SPOTIFY_GREEN, fontFamily: 'var(--font-mono)' }}>
                    adding…
                  </span>
                ) : (
                  <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: `${SPOTIFY_GREEN}22`, color: SPOTIFY_GREEN, border: `1px solid ${SPOTIFY_GREEN}44` }}>
                    +
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
