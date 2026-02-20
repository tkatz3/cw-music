import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DndContext, DragOverlay,
  PointerSensor, TouchSensor,
  useSensor, useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';

import { PinGate, checkPinAuth } from '../components/PinGate';
import { ScheduleGrid } from '../components/ScheduleGrid';
import { StationSidebar } from '../components/StationSidebar';
import { MiniPlayer } from '../components/MiniPlayer';
import { SettingsPanel } from '../components/SettingsPanel';

import { useSchedule } from '../hooks/useSchedule';
import { useSettings } from '../hooks/useSettings';
import { useStations } from '../hooks/useStations';
import { usePlaylists } from '../hooks/usePlaylists';
import { useSpotifyPlaylists } from '../hooks/useSpotifyPlaylists';
import { getCurrentStation } from '../lib/schedule';

const SPOTIFY_GREEN = '#1DB954';

export function ScheduleManager() {
  const [authenticated, setAuthenticated] = useState(checkPinAuth());
  const [showSettings, setShowSettings] = useState(false);

  // Data hooks
  const { blocks, loading: schedLoading, error: schedError, assignStation, assignPlaylist, assignSpotifyPlaylist } = useSchedule();
  const { settings, loading: settingsLoading, error: settingsError, updateSetting } = useSettings();
  const { stations, loading: stationsLoading, addStation, removeStation } = useStations();
  const { playlists, createPlaylist, updatePlaylist, deletePlaylist } = usePlaylists();
  const { playlists: spotifyPlaylists, addPlaylist: addSpotifyPlaylist, removePlaylist: removeSpotifyPlaylist } = useSpotifyPlaylists();

  // DnD — lifted here so it wraps both sidebar AND grid
  const [activeDragType, setActiveDragType] = useState<'station' | 'playlist' | 'spotify-playlist' | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  function handleDragStart(event: DragStartEvent) {
    const id = event.active.id as string;
    if (id.startsWith('station-')) {
      setActiveDragType('station');
      setActiveDragId(event.active.data.current?.stationId ?? null);
    } else if (id.startsWith('playlist-')) {
      setActiveDragType('playlist');
      setActiveDragId(event.active.data.current?.playlistId ?? null);
    } else if (id.startsWith('spotify-')) {
      setActiveDragType('spotify-playlist');
      setActiveDragId(event.active.data.current?.spotifyPlaylistId ?? null);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragType(null);
    setActiveDragId(null);

    const slotData = event.over?.data.current as { day: number; hour: number } | undefined;
    if (!slotData) return;

    const id = event.active.id as string;
    if (id.startsWith('station-')) {
      const stationId = event.active.data.current?.stationId as string;
      if (stationId) assignStation(slotData.day, slotData.hour, stationId);
    } else if (id.startsWith('playlist-')) {
      const playlistId = event.active.data.current?.playlistId as string;
      const playlist = playlists.find((p) => p.id === playlistId);
      if (playlist) assignPlaylist(slotData.day, slotData.hour, playlist);
    } else if (id.startsWith('spotify-')) {
      const spotifyPlaylistId = event.active.data.current?.spotifyPlaylistId as string;
      const spotifyPlaylist = spotifyPlaylists.find((p) => p.id === spotifyPlaylistId);
      if (spotifyPlaylist) assignSpotifyPlaylist(slotData.day, slotData.hour, spotifyPlaylist.uri, spotifyPlaylist.name);
    }
  }

  // Resolve what's actually playing for MiniPlayer display
  const scheduledStation = getCurrentStation(blocks, stations, settings.default_station);
  const manualStation = !settings.follow_schedule && settings.manual_station_override
    ? stations.find((s) => s.id === settings.manual_station_override) ?? null
    : null;
  const currentStation = manualStation ?? scheduledStation;

  const isLoading = schedLoading || settingsLoading || stationsLoading;
  const error = schedError || settingsError;

  // Drag overlay data
  const dragStation = activeDragType === 'station' ? stations.find((s) => s.id === activeDragId) : null;
  const dragPlaylist = activeDragType === 'playlist' ? playlists.find((p) => p.id === activeDragId) : null;
  const dragSpotifyPlaylist = activeDragType === 'spotify-playlist' ? spotifyPlaylists.find((p) => p.id === activeDragId) : null;

  if (!authenticated) {
    return (
      <PinGate
        correctPin={settings.pin}
        onAuthenticated={() => setAuthenticated(true)}
      />
    );
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div
        className="flex flex-col"
        style={{ height: '100dvh', backgroundColor: '#17110C' }}
      >
        {/* ── Top bar ── */}
        <header
          className="flex items-center justify-between px-5 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid #2E2317' }}
        >
          <div className="flex items-center gap-3">
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                color: '#E4A530',
                fontSize: '1.1rem',
                fontWeight: 600,
                letterSpacing: '0.02em',
              }}
            >
              Culture Works
            </h1>
            <span
              className="hidden sm:block text-[10px]"
              style={{ color: '#3A2F20', fontFamily: 'var(--font-mono)' }}
            >
              / music
            </span>
          </div>

          {/* Centre: mini player */}
          <div className="flex-1 flex justify-center px-4">
            <MiniPlayer
              station={currentStation}
              isPlaying={!settings.is_paused}
              followSchedule={settings.follow_schedule}
              stations={stations}
              playlists={playlists}
              onToggle={() => updateSetting('is_paused', !settings.is_paused)}
              onToggleFollow={() => updateSetting('follow_schedule', !settings.follow_schedule)}
              onPickStation={(id) => updateSetting('manual_station_override', id)}
            />
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-3">
            <Link
              to="/player"
              className="text-[11px] px-3 py-1.5 rounded-lg transition-colors hidden sm:block"
              style={{
                color: '#8A7D6B', fontFamily: 'var(--font-mono)',
                border: '1px solid #2E2317',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#E4A530'; (e.currentTarget as HTMLElement).style.borderColor = '#7A5A18'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#8A7D6B'; (e.currentTarget as HTMLElement).style.borderColor = '#2E2317'; }}
            >
              player view →
            </Link>
            <button
              onClick={() => setShowSettings(true)}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
              style={{ color: '#534840', border: '1px solid #2E2317' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#E4A530'; (e.currentTarget as HTMLElement).style.borderColor = '#7A5A18'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#534840'; (e.currentTarget as HTMLElement).style.borderColor = '#2E2317'; }}
              aria-label="Settings"
              title="Settings"
            >
              <span style={{ fontSize: '0.9rem' }}>⚙</span>
            </button>
          </div>
        </header>

        {/* ── Main ── */}
        <div className="flex flex-1 overflow-hidden gap-0">
          {/* Sidebar — desktop only */}
          <aside
            className="hidden md:flex flex-col p-4 flex-shrink-0 overflow-hidden"
            style={{ width: '220px', borderRight: '1px solid #2E2317' }}
          >
            <StationSidebar
              stations={stations}
              playlists={playlists}
              spotifyPlaylists={spotifyPlaylists}
              spotifyConnected={settings.spotify_connected && !!settings.spotify_refresh_token}
              onAddStation={addStation}
              onRemoveStation={removeStation}
              onCreatePlaylist={createPlaylist}
              onUpdatePlaylist={(id, updates) => updatePlaylist(id, updates)}
              onDeletePlaylist={deletePlaylist}
              onAddSpotifyPlaylist={addSpotifyPlaylist}
              onRemoveSpotifyPlaylist={removeSpotifyPlaylist}
            />
          </aside>

          {/* Schedule grid */}
          <main className="flex-1 overflow-hidden flex flex-col">
            {isLoading ? (
              <div className="flex items-center justify-center flex-1">
                <p className="text-sm animate-pulse" style={{ color: '#534840', fontFamily: 'var(--font-mono)' }}>
                  Loading…
                </p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center flex-1 gap-3 px-6 text-center">
                <p className="text-sm font-medium" style={{ color: '#E05757', fontFamily: 'var(--font-mono)' }}>
                  Firebase connection failed
                </p>
                <p className="text-xs max-w-sm" style={{ color: '#534840', fontFamily: 'var(--font-mono)' }}>
                  {error}
                </p>
              </div>
            ) : stations.length === 0 && spotifyPlaylists.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 gap-4 px-6 text-center">
                <div>
                  <p style={{ fontFamily: 'var(--font-display)', color: '#F0E6D3', fontSize: '1.1rem', fontWeight: 600 }}>
                    Build your station library
                  </p>
                  <p className="text-xs mt-2" style={{ color: '#534840', fontFamily: 'var(--font-mono)' }}>
                    Search for radio stations or add Spotify playlists in the panel on the left, then drag them onto the schedule.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-hidden p-4">
                <ScheduleGrid stations={stations} spotifyPlaylists={spotifyPlaylists} />
              </div>
            )}
          </main>
        </div>

        {/* Mobile notice */}
        <div
          className="md:hidden flex-shrink-0 px-4 py-2 text-center text-[10px]"
          style={{ borderTop: '1px solid #2E2317', color: '#3A2F20', fontFamily: 'var(--font-mono)' }}
        >
          Open on desktop to manage the schedule
        </div>
      </div>

      {/* ── Drag overlay ── */}
      <DragOverlay>
        {dragStation && (
          <div
            className="px-3 py-1.5 rounded-lg text-xs font-medium shadow-2xl pointer-events-none"
            style={{
              backgroundColor: `${dragStation.color}22`,
              border: `1.5px solid ${dragStation.color}88`,
              color: dragStation.color,
              fontFamily: 'var(--font-mono)',
              backdropFilter: 'blur(4px)',
            }}
          >
            {dragStation.name}
          </div>
        )}
        {dragPlaylist && (
          <div
            className="px-3 py-1.5 rounded-lg text-xs font-medium shadow-2xl pointer-events-none"
            style={{
              backgroundColor: `${dragPlaylist.color}22`,
              border: `1.5px solid ${dragPlaylist.color}88`,
              color: dragPlaylist.color,
              fontFamily: 'var(--font-mono)',
              backdropFilter: 'blur(4px)',
            }}
          >
            ▶ {dragPlaylist.name} · {dragPlaylist.stationIds.length}h
          </div>
        )}
        {dragSpotifyPlaylist && (
          <div
            className="px-3 py-1.5 rounded-lg text-xs font-medium shadow-2xl pointer-events-none flex items-center gap-2"
            style={{
              backgroundColor: `${SPOTIFY_GREEN}22`,
              border: `1.5px solid ${SPOTIFY_GREEN}88`,
              color: SPOTIFY_GREEN,
              fontFamily: 'var(--font-mono)',
              backdropFilter: 'blur(4px)',
            }}
          >
            ♪ {dragSpotifyPlaylist.name}
          </div>
        )}
      </DragOverlay>

      {/* Settings */}
      {showSettings && (
        <SettingsPanel
          settings={settings}
          stations={stations}
          spotifyPlaylists={spotifyPlaylists}
          onUpdateSetting={updateSetting}
          onClose={() => setShowSettings(false)}
        />
      )}
    </DndContext>
  );
}
