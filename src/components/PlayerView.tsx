import { useEffect, useRef, useState } from 'react';
import { useSchedule } from '../hooks/useSchedule';
import { useSettings } from '../hooks/useSettings';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { getCurrentStation, getNextStation } from '../lib/schedule';
import { AudioVisualizer } from './AudioVisualizer';
import { VolumeControl } from './VolumeControl';

function formatTime(date: Date) {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatDate(date: Date) {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

export function PlayerView() {
  const { blocks } = useSchedule();
  const { settings, updateSetting } = useSettings();
  const audio = useAudioPlayer();
  const [now, setNow] = useState(new Date());
  const [cursorVisible, setCursorVisible] = useState(true);
  const cursorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const currentStation = getCurrentStation(blocks, settings.default_station);
  const nextInfo = getNextStation(blocks, settings.default_station);

  // Clock tick
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Switch stream when station changes
  useEffect(() => {
    if (!audio.started || !currentStation) return;
    if (audio.currentUrl !== currentStation.stream_url) {
      audio.switchStream(currentStation.stream_url);
    }
  }, [currentStation?.id]);

  // Sync volume
  useEffect(() => {
    audio.setVolume(settings.volume);
  }, [settings.volume]);

  // Sync pause state
  useEffect(() => {
    if (!audio.started) return;
    audio.setPaused(settings.is_paused);
  }, [settings.is_paused, audio.started]);

  // Wake Lock
  useEffect(() => {
    async function requestWakeLock() {
      if ('wakeLock' in navigator) {
        try {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
        } catch {}
      }
    }
    requestWakeLock();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') requestWakeLock();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      wakeLockRef.current?.release();
    };
  }, []);

  // Cursor hide
  useEffect(() => {
    function onMove() {
      setCursorVisible(true);
      if (cursorTimer.current) clearTimeout(cursorTimer.current);
      cursorTimer.current = setTimeout(() => setCursorVisible(false), 5000);
    }
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  function handleStart() {
    audio.start(currentStation.stream_url, settings.volume);
  }

  async function handleVolumeChange(v: number) {
    audio.setVolume(v);
    await updateSetting('volume', v);
  }

  async function handleTogglePause() {
    const next = !settings.is_paused;
    audio.setPaused(next);
    await updateSetting('is_paused', next);
  }

  return (
    <div
      className="min-h-screen bg-app-bg flex flex-col items-center justify-center p-6 text-center relative overflow-hidden"
      style={{ cursor: cursorVisible ? 'default' : 'none' }}
    >
      {/* Background glow */}
      <div
        className="absolute inset-0 opacity-5 pointer-events-none transition-colors duration-1000"
        style={{
          background: `radial-gradient(ellipse at center, ${currentStation?.color ?? '#f0a500'} 0%, transparent 70%)`,
        }}
      />

      {!audio.started ? (
        /* Start screen */
        <div className="space-y-8 relative z-10">
          <div>
            <h1 className="text-4xl font-mono font-bold text-amber-400 tracking-wider">CULTURE WORKS</h1>
            <p className="text-gray-400 mt-2 tracking-widest uppercase text-sm">Music System</p>
          </div>
          <button
            onClick={handleStart}
            className="px-12 py-5 bg-amber-500 hover:bg-amber-400 text-black font-mono font-bold text-xl rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95"
          >
            ▶ Start Playback
          </button>
          <p className="text-gray-500 text-xs">Browser requires a tap to enable audio</p>
        </div>
      ) : (
        /* Now playing screen */
        <div className="w-full max-w-lg space-y-8 relative z-10">
          {/* Clock */}
          <div>
            <p className="text-5xl font-mono font-bold text-white tracking-tight">{formatTime(now)}</p>
            <p className="text-gray-400 text-sm mt-1 font-mono">{formatDate(now)}</p>
          </div>

          {/* Station display */}
          <div className="space-y-4">
            <div
              className="w-20 h-20 rounded-full mx-auto flex items-center justify-center shadow-2xl"
              style={{
                backgroundColor: `${currentStation.color}22`,
                border: `2px solid ${currentStation.color}`,
                boxShadow: `0 0 30px ${currentStation.color}44`,
              }}
            >
              <AudioVisualizer
                active={!settings.is_paused}
                color={currentStation.color}
                size="lg"
              />
            </div>

            <div>
              <div className="flex items-center justify-center gap-2 mb-1">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: settings.is_paused ? '#6b7280' : '#4ade80',
                    boxShadow: settings.is_paused ? 'none' : '0 0 8px #4ade80',
                    animation: settings.is_paused ? 'none' : 'pulse 2s infinite',
                  }}
                />
                <span className="text-xs text-gray-400 uppercase tracking-widest font-mono">
                  {settings.is_paused ? 'Paused' : 'Live'}
                </span>
              </div>
              <h2
                className="text-3xl font-mono font-bold"
                style={{ color: currentStation.color }}
              >
                {currentStation.name}
              </h2>
              <p className="text-gray-300 text-sm mt-2 max-w-sm mx-auto leading-relaxed">
                {currentStation.description}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={handleTogglePause}
              className="w-14 h-14 rounded-full font-mono text-xl transition-all hover:scale-110 active:scale-95 border-2"
              style={{
                backgroundColor: `${currentStation.color}22`,
                borderColor: currentStation.color,
                color: currentStation.color,
              }}
            >
              {settings.is_paused ? '▶' : '⏸'}
            </button>
            <VolumeControl volume={settings.volume} onChange={handleVolumeChange} />
          </div>

          {/* Up next */}
          {nextInfo && (
            <div className="border-t border-gray-700/50 pt-4">
              <p className="text-xs text-gray-500 uppercase tracking-widest font-mono mb-1">Up Next</p>
              <p className="text-gray-300 text-sm font-mono">
                <span style={{ color: nextInfo.station.color }}>{nextInfo.station.name}</span>
                <span className="text-gray-500"> · {nextInfo.label}</span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Manager link */}
      <a
        href="/"
        className="absolute bottom-4 right-4 text-xs text-gray-600 hover:text-gray-400 transition-colors font-mono"
      >
        manage →
      </a>
    </div>
  );
}
