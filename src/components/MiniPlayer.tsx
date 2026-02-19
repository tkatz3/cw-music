import { useRef, useState } from 'react';
import { AudioVisualizer } from './AudioVisualizer';
import type { Station, Playlist } from '../lib/stations';

interface MiniPlayerProps {
  station: Station | null;
  isPlaying: boolean;
  followSchedule: boolean;
  stations: Station[];
  playlists: Playlist[];
  onToggle: () => void;
  onToggleFollow: () => void;
  onPickStation: (stationId: string) => void;
}

export function MiniPlayer({
  station, isPlaying, followSchedule,
  stations, playlists,
  onToggle, onToggleFollow, onPickStation,
}: MiniPlayerProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  function pickStation(id: string) {
    onPickStation(id);
    setPickerOpen(false);
  }

  function pickRandomFromPlaylist(pl: Playlist) {
    const available = pl.stationIds.filter((id) => stations.find((s) => s.id === id));
    if (available.length === 0) return;
    const id = available[Math.floor(Math.random() * available.length)];
    pickStation(id);
  }

  return (
    <div className="flex items-center gap-4 relative">
      {/* Play / pause */}
      <button
        onClick={onToggle}
        className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 flex-shrink-0"
        style={{
          backgroundColor: station ? `${station.color}22` : '#2E2317',
          border: `1.5px solid ${station ? `${station.color}55` : '#3A2F20'}`,
          color: station?.color ?? '#534840',
        }}
        title={isPlaying ? 'Pause (affects space + all devices)' : 'Play (affects space + all devices)'}
      >
        <span style={{ fontSize: '0.7rem' }}>{isPlaying ? '⏸' : '▶'}</span>
      </button>

      {/* Station name + visualizer */}
      <div className="flex items-center gap-2 min-w-0">
        {station ? (
          <>
            <div
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{
                backgroundColor: isPlaying ? station.color : '#534840',
                animation: isPlaying ? 'pulse-dot 2s ease-in-out infinite' : 'none',
                boxShadow: isPlaying ? `0 0 5px ${station.color}88` : 'none',
              }}
            />
            <span
              className="text-xs truncate max-w-[110px]"
              style={{ color: isPlaying ? '#F0E6D3' : '#8A7D6B', fontFamily: 'var(--font-mono)' }}
            >
              {station.name}
            </span>
            {isPlaying && <AudioVisualizer active color={station.color} size="sm" />}
          </>
        ) : (
          <span className="text-xs" style={{ color: '#534840', fontFamily: 'var(--font-mono)' }}>
            no station
          </span>
        )}
      </div>

      {/* Divider */}
      <div className="w-px h-5 flex-shrink-0" style={{ backgroundColor: '#2E2317' }} />

      {/* Follow schedule toggle */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={onToggleFollow}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] transition-all"
          style={{
            backgroundColor: followSchedule ? '#E4A53018' : '#1F1710',
            border: `1px solid ${followSchedule ? '#7A5A18' : '#2E2317'}`,
            color: followSchedule ? '#E4A530' : '#534840',
            fontFamily: 'var(--font-mono)',
          }}
          title={followSchedule ? 'Auto-playing based on schedule — click to switch to manual' : 'Manual mode — click to follow schedule'}
        >
          <span
            className="w-3 h-3 rounded-full flex-shrink-0 transition-colors"
            style={{ backgroundColor: followSchedule ? '#E4A530' : '#3A2F20', display: 'inline-block' }}
          />
          {followSchedule ? 'follow schedule' : 'manual'}
        </button>

        {/* Manual mode: pick what plays */}
        {!followSchedule && stations.length > 0 && (
          <div className="relative" ref={pickerRef}>
            <button
              onClick={() => setPickerOpen((v) => !v)}
              className="text-[10px] px-2 py-1 rounded-md transition-colors"
              style={{
                color: '#8A7D6B', fontFamily: 'var(--font-mono)',
                border: '1px solid #2E2317',
                backgroundColor: pickerOpen ? '#271E14' : 'transparent',
              }}
              title="Pick what plays now"
            >
              change ▾
            </button>

            {pickerOpen && (
              <div
                className="absolute top-full mt-1.5 right-0 z-50 rounded-xl overflow-hidden animate-fade-in"
                style={{
                  backgroundColor: '#1F1710',
                  border: '1px solid #3A2F20',
                  minWidth: '180px',
                  maxHeight: '320px',
                  overflowY: 'auto',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                }}
              >
                {/* Stations */}
                <div className="px-3 pt-3 pb-1">
                  <p style={{ color: '#534840', fontSize: '9px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Stations
                  </p>
                </div>
                {stations.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => pickStation(s.id)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors"
                    style={{ fontFamily: 'var(--font-mono)' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#271E14'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-xs truncate" style={{ color: '#F0E6D3' }}>{s.name}</span>
                    {station?.id === s.id && (
                      <span style={{ color: '#E4A530', fontSize: '9px', marginLeft: 'auto' }}>now</span>
                    )}
                  </button>
                ))}

                {/* Playlists — random pick */}
                {playlists.length > 0 && (
                  <>
                    <div className="px-3 pt-3 pb-1" style={{ borderTop: '1px solid #2E2317', marginTop: '4px' }}>
                      <p style={{ color: '#534840', fontSize: '9px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        Random from playlist
                      </p>
                    </div>
                    {playlists.map((pl) => {
                      const hasStations = pl.stationIds.some((id) => stations.find((s) => s.id === id));
                      return (
                        <button
                          key={pl.id}
                          onClick={() => hasStations && pickRandomFromPlaylist(pl)}
                          disabled={!hasStations}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors"
                          style={{ fontFamily: 'var(--font-mono)', opacity: hasStations ? 1 : 0.4 }}
                          onMouseEnter={(e) => { if (hasStations) (e.currentTarget as HTMLElement).style.backgroundColor = '#271E14'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                        >
                          <span style={{ color: pl.color, fontSize: '0.65rem' }}>🎲</span>
                          <span className="text-xs truncate" style={{ color: '#F0E6D3' }}>{pl.name}</span>
                          <span style={{ color: '#534840', fontSize: '9px', marginLeft: 'auto', flexShrink: 0 }}>
                            {pl.stationIds.length}
                          </span>
                        </button>
                      );
                    })}
                  </>
                )}

                <div className="pb-2" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Close picker on outside click */}
      {pickerOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}
