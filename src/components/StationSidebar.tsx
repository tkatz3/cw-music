import { useState } from 'react';
import { StationCard } from './StationCard';
import { PlaylistCard } from './PlaylistCard';
import { PlaylistEditor } from './PlaylistEditor';
import { SpotifyPlaylistCard } from './SpotifyPlaylistCard';
import { AddPlaylistForm } from './AddPlaylistForm';
import { useRadioBrowser } from '../hooks/useRadioBrowser';
import type { Station, Playlist, SpotifyPlaylistRecord } from '../lib/stations';
import type { RadioBrowserStation } from '../hooks/useStations';

const SPOTIFY_GREEN = '#1DB954';

interface StationSidebarProps {
  stations: Station[];
  playlists: Playlist[];
  spotifyPlaylists: SpotifyPlaylistRecord[];
  spotifyConnected: boolean;
  onAddStation: (rb: RadioBrowserStation) => void;
  onRemoveStation: (id: string) => void;
  onCreatePlaylist: (name: string, stationIds: string[]) => Promise<unknown>;
  onUpdatePlaylist: (id: string, updates: { name?: string; stationIds?: string[] }) => Promise<void>;
  onDeletePlaylist: (id: string) => Promise<void>;
  onAddSpotifyPlaylist: (playlist: SpotifyPlaylistRecord) => Promise<void>;
  onRemoveSpotifyPlaylist: (id: string) => Promise<void>;
}

export function StationSidebar({
  stations, playlists, spotifyPlaylists, spotifyConnected,
  onAddStation, onRemoveStation,
  onCreatePlaylist, onUpdatePlaylist, onDeletePlaylist,
  onAddSpotifyPlaylist, onRemoveSpotifyPlaylist,
}: StationSidebarProps) {
  const [query, setQuery] = useState('');
  const { results, searching, search, clearResults } = useRadioBrowser();
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | 'new' | null>(null);
  const [showAddSpotify, setShowAddSpotify] = useState(false);

  const savedIds = new Set(stations.map((s) => s.id));
  const showSearch = query.trim().length > 0;

  function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
    search(e.target.value);
  }

  function handleClearSearch() {
    setQuery('');
    clearResults();
  }

  return (
    <aside className="w-52 flex-shrink-0 flex flex-col gap-3 overflow-hidden h-full">
      {/* Search */}
      <div className="relative flex-shrink-0">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px]" style={{ color: '#534840' }}>🔍</span>
        <input
          type="text"
          value={query}
          onChange={handleQueryChange}
          placeholder="Search radio stations…"
          className="w-full pl-7 pr-7 py-2 rounded-lg text-xs"
          style={{
            backgroundColor: '#271E14', border: '1px solid #2E2317',
            color: '#F0E6D3', fontFamily: 'var(--font-mono)', outline: 'none',
          }}
          onFocus={(e) => { e.target.style.borderColor = '#E4A530'; }}
          onBlur={(e) => { e.target.style.borderColor = '#2E2317'; }}
        />
        {query && (
          <button
            onClick={handleClearSearch}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-lg leading-none"
            style={{ color: '#534840' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#8A7D6B'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#534840'; }}
          >
            ×
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-4 pr-0.5">
        {showSearch ? (
          /* ── Search results ── */
          <div className="flex flex-col gap-1.5">
            {searching && (
              <p className="text-[10px] px-1" style={{ color: '#534840', fontFamily: 'var(--font-mono)' }}>
                Searching…
              </p>
            )}
            {!searching && results.length === 0 && (
              <p className="text-[10px] px-1" style={{ color: '#534840', fontFamily: 'var(--font-mono)' }}>
                No results
              </p>
            )}
            {results.map((rb) => {
              const already = savedIds.has(rb.stationuuid);
              return (
                <div
                  key={rb.stationuuid}
                  className="flex items-start gap-2 px-3 py-2.5 rounded-lg"
                  style={{ backgroundColor: '#271E14', border: '1px solid #2E2317' }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium truncate" style={{ color: '#F0E6D3', fontFamily: 'var(--font-mono)' }}>
                      {rb.name}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: '#534840', fontFamily: 'var(--font-mono)' }}>
                      {rb.country}{rb.bitrate ? ` · ${rb.bitrate}k` : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => !already && onAddStation(rb)}
                    disabled={already}
                    className="flex-shrink-0 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center transition-all"
                    style={{
                      backgroundColor: already ? '#2E2317' : '#E4A530',
                      color: already ? '#534840' : '#17110C',
                      cursor: already ? 'default' : 'pointer',
                    }}
                    title={already ? 'Already in library' : 'Add to library'}
                  >
                    {already ? '✓' : '+'}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <>
            {/* ── Stations ── */}
            <div>
              <div className="flex items-center gap-2 mb-2 px-0.5">
                <span className="text-[10px] uppercase tracking-widest" style={{ color: '#534840', fontFamily: 'var(--font-mono)' }}>
                  Stations
                </span>
                {stations.length > 0 && (
                  <span className="text-[10px]" style={{ color: '#3A2F20', fontFamily: 'var(--font-mono)' }}>
                    · drag to schedule
                  </span>
                )}
              </div>

              {stations.length === 0 ? (
                <div className="rounded-lg p-3 text-center" style={{ border: '1px dashed #2E2317' }}>
                  <p className="text-[11px] leading-relaxed" style={{ color: '#534840', fontFamily: 'var(--font-mono)' }}>
                    Search above to find<br />stations to add
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {stations.map((station) => (
                    <StationCard
                      key={station.id}
                      station={station}
                      onRemove={() => onRemoveStation(station.id)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* ── Station Playlists ── */}
            <div>
              <div className="flex items-center justify-between mb-2 px-0.5">
                <span className="text-[10px] uppercase tracking-widest" style={{ color: '#534840', fontFamily: 'var(--font-mono)' }}>
                  Playlists
                </span>
                {stations.length > 0 && (
                  <button
                    onClick={() => setEditingPlaylist('new')}
                    className="text-[10px] transition-colors"
                    style={{ color: '#7A5A18', fontFamily: 'var(--font-mono)' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#E4A530'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#7A5A18'; }}
                  >
                    + new
                  </button>
                )}
              </div>

              {playlists.length === 0 ? (
                <div className="rounded-lg p-3 text-center" style={{ border: '1px dashed #2E2317' }}>
                  <p className="text-[11px] leading-relaxed" style={{ color: '#534840', fontFamily: 'var(--font-mono)' }}>
                    {stations.length === 0
                      ? 'Add stations first'
                      : 'Group stations into playlists — drops fill multiple hours at once'}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {playlists.map((pl) => (
                    <PlaylistCard
                      key={pl.id}
                      playlist={pl}
                      stations={stations}
                      onEdit={() => setEditingPlaylist(pl)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* ── Spotify Playlists ── */}
            <div>
              <div className="flex items-center justify-between mb-2 px-0.5">
                <span className="text-[10px] uppercase tracking-widest" style={{ color: SPOTIFY_GREEN, fontFamily: 'var(--font-mono)', opacity: 0.8 }}>
                  Spotify
                </span>
                {spotifyConnected && (
                  <button
                    onClick={() => setShowAddSpotify(true)}
                    className="text-[10px] transition-colors"
                    style={{ color: SPOTIFY_GREEN, fontFamily: 'var(--font-mono)', opacity: 0.7 }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.7'; }}
                  >
                    + add
                  </button>
                )}
              </div>

              {!spotifyConnected ? (
                <div className="rounded-lg p-3 text-center" style={{ border: `1px dashed ${SPOTIFY_GREEN}33` }}>
                  <p className="text-[11px] leading-relaxed" style={{ color: '#534840', fontFamily: 'var(--font-mono)' }}>
                    Connect Spotify in Settings to add playlists
                  </p>
                </div>
              ) : spotifyPlaylists.length === 0 ? (
                <div className="rounded-lg p-3 text-center" style={{ border: `1px dashed ${SPOTIFY_GREEN}33` }}>
                  <p className="text-[11px] leading-relaxed" style={{ color: '#534840', fontFamily: 'var(--font-mono)' }}>
                    Add a Spotify playlist to drag it onto the schedule
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {spotifyPlaylists.map((pl) => (
                    <SpotifyPlaylistCard
                      key={pl.id}
                      playlist={pl}
                      onRemove={() => onRemoveSpotifyPlaylist(pl.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Station playlist editor modal */}
      {editingPlaylist && (
        <PlaylistEditor
          playlist={editingPlaylist === 'new' ? undefined : editingPlaylist}
          stations={stations}
          onSave={async (name, stationIds) => {
            if (editingPlaylist === 'new') {
              await onCreatePlaylist(name, stationIds);
            } else {
              await onUpdatePlaylist(editingPlaylist.id, { name, stationIds });
            }
          }}
          onDelete={editingPlaylist !== 'new' ? async () => {
            await onDeletePlaylist((editingPlaylist as Playlist).id);
          } : undefined}
          onClose={() => setEditingPlaylist(null)}
        />
      )}

      {/* Add Spotify playlist modal */}
      {showAddSpotify && (
        <AddPlaylistForm
          onAdd={onAddSpotifyPlaylist}
          onClose={() => setShowAddSpotify(false)}
        />
      )}
    </aside>
  );
}
