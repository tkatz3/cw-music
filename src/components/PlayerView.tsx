import { useEffect, useRef, useState } from 'react';
import { useSchedule } from '../hooks/useSchedule';
import { useSettings } from '../hooks/useSettings';
import { useStations } from '../hooks/useStations';
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
  const { stations } = useStations();
  const audio = useAudioPlayer();

  const [now, setNow] = useState(new Date());
  const [cursorVisible, setCursorVisible] = useState(true);
  const cursorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // Track previous "in-block" state so we only write to Firebase on transitions
  const prevInBlock = useRef<boolean | null>(null);
  // Track previous minute so follow-schedule only evaluates at minute boundaries
  const prevMinute = useRef<number>(-1);

  // Resolve effective station: manual override (when not following schedule) or scheduled
  const scheduledStation = getCurrentStation(blocks, stations, settings.default_station);
  const manualStation = !settings.follow_schedule && settings.manual_station_override
    ? stations.find((s) => s.id === settings.manual_station_override) ?? null
    : null;
  const currentStation = manualStation ?? scheduledStation;
  const nextInfo = getNextStation(blocks, stations, settings.default_station);

  // Helper: is there a scheduled block active right now?
  function isInScheduledBlock(atTime: Date): boolean {
    const day = (atTime.getDay() + 6) % 7;
    const h = atTime.getHours();
    const m = atTime.getMinutes();
    return blocks.some(
      (b) =>
        b.day_of_week === day &&
        (b.start_hour < h || (b.start_hour === h && b.start_minute <= m)) &&
        (b.end_hour > h || (b.end_hour === h && b.end_minute > m))
    );
  }

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Follow-schedule: auto-play/pause at block boundaries (checked once per minute)
  useEffect(() => {
    if (!settings.follow_schedule) {
      prevInBlock.current = null;
      prevMinute.current = -1;
      return;
    }

    const minute = now.getHours() * 60 + now.getMinutes();
    // Bypass minute check on first evaluation (prevInBlock === null); otherwise only act on minute change
    if (minute === prevMinute.current && prevInBlock.current !== null) return;
    prevMinute.current = minute;

    const inBlock = isInScheduledBlock(now);

    if (prevInBlock.current === null) {
      // First evaluation after follow_schedule turned on — apply immediately
      prevInBlock.current = inBlock;
      if (inBlock && settings.is_paused) updateSetting('is_paused', false);
      else if (!inBlock && !settings.is_paused) updateSetting('is_paused', true);
      return;
    }

    if (inBlock !== prevInBlock.current) {
      prevInBlock.current = inBlock;
      // Entered a block → auto-resume; left a block → auto-pause
      updateSetting('is_paused', !inBlock);
    }
  }, [now, settings.follow_schedule, blocks]);

  // Auto-start: when follow_schedule wants to play but audio hasn't been started yet
  // (e.g. Pi rebooted mid-block, or page refreshed while a block is active)
  useEffect(() => {
    if (!settings.follow_schedule || audio.started || !currentStation) return;
    if (!settings.is_paused && isInScheduledBlock(new Date())) {
      audio.start(currentStation.stream_url, settings.volume);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.follow_schedule, settings.is_paused, audio.started, currentStation?.id, blocks]);

  // Stream switch: only fires when station ID actually changes
  useEffect(() => {
    if (!audio.started || !currentStation) return;
    if (audio.currentUrl !== currentStation.stream_url) {
      audio.switchStream(currentStation.stream_url);
    }
  }, [currentStation?.id]);

  useEffect(() => { audio.setVolume(settings.volume); }, [settings.volume]);

  useEffect(() => {
    if (!audio.started) return;
    audio.setPaused(settings.is_paused);
  }, [settings.is_paused, audio.started]);

  useEffect(() => {
    async function requestWakeLock() {
      if ('wakeLock' in navigator) {
        try { wakeLockRef.current = await navigator.wakeLock.request('screen'); } catch {}
      }
    }
    requestWakeLock();
    const handleVisibility = () => { if (document.visibilityState === 'visible') requestWakeLock(); };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      wakeLockRef.current?.release();
    };
  }, []);

  useEffect(() => {
    function onMove() {
      setCursorVisible(true);
      if (cursorTimer.current) clearTimeout(cursorTimer.current);
      cursorTimer.current = setTimeout(() => setCursorVisible(false), 4000);
    }
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  function handleStart() {
    if (!currentStation) return;
    audio.start(currentStation.stream_url, settings.volume);
  }

  async function handleTogglePause() {
    const next = !settings.is_paused;
    audio.setPaused(next);
    await updateSetting('is_paused', next);
  }

  async function handleVolumeChange(v: number) {
    audio.setVolume(v);
    await updateSetting('volume', v);
  }

  const accentColor = currentStation?.color ?? '#E4A530';

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 text-center relative overflow-hidden"
      style={{
        backgroundColor: '#17110C',
        cursor: cursorVisible ? 'default' : 'none',
      }}
    >
      {/* Warm background glow */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-2000"
        style={{
          background: `radial-gradient(ellipse 60% 50% at 50% 60%, ${accentColor}0C 0%, transparent 70%)`,
        }}
      />

      {/* Subtle grain */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      {!currentStation ? (
        /* No stations */
        <div className="space-y-4 relative z-10 animate-fade-in">
          <h1 style={{ fontFamily: 'var(--font-display)', color: '#E4A530', fontSize: '2rem', fontWeight: 700 }}>
            Culture Works
          </h1>
          <p style={{ color: '#534840', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
            No stations configured.
          </p>
          <a
            href="/"
            style={{ color: '#E4A530', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
          >
            Open the scheduler →
          </a>
        </div>

      ) : !audio.started ? (
        /* Start screen */
        <div className="space-y-10 relative z-10 animate-fade-in">
          <div>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                color: '#F0E6D3',
                fontSize: '2.5rem',
                fontWeight: 700,
                letterSpacing: '-0.01em',
                lineHeight: 1.15,
              }}
            >
              Culture Works
            </h1>
            <p
              className="mt-2 tracking-widest uppercase"
              style={{ color: '#534840', fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}
            >
              Music System
            </p>
          </div>

          {/* Current station preview */}
          <div className="space-y-1">
            <p style={{ color: '#534840', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Now scheduled
            </p>
            <p style={{ fontFamily: 'var(--font-display)', color: accentColor, fontSize: '1.3rem', fontWeight: 600 }}>
              {currentStation.name}
            </p>
          </div>

          <button
            onClick={handleStart}
            className="transition-all hover:scale-105 active:scale-95 px-10 py-4 rounded-2xl"
            style={{
              backgroundColor: accentColor,
              color: '#17110C',
              fontFamily: 'var(--font-mono)',
              fontWeight: 500,
              fontSize: '1rem',
              letterSpacing: '0.05em',
              boxShadow: `0 0 40px ${accentColor}44`,
            }}
          >
            ▶ start
          </button>
          <p style={{ color: '#3A2F20', fontFamily: 'var(--font-mono)', fontSize: '0.65rem' }}>
            tap to enable audio
          </p>
        </div>

      ) : (
        /* Now playing */
        <div className="w-full max-w-md space-y-10 relative z-10 animate-fade-in">
          {/* Clock */}
          <div>
            <p
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '4rem',
                fontWeight: 600,
                color: '#F0E6D3',
                letterSpacing: '-0.02em',
                lineHeight: 1,
              }}
            >
              {formatTime(now)}
            </p>
            <p
              className="mt-2"
              style={{ color: '#534840', fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}
            >
              {formatDate(now)}
            </p>
          </div>

          {/* Visualizer + station */}
          <div className="space-y-5">
            <div
              className="w-20 h-20 rounded-full mx-auto flex items-center justify-center"
              style={{
                backgroundColor: `${accentColor}12`,
                border: `1.5px solid ${accentColor}44`,
                boxShadow: `0 0 40px ${accentColor}22`,
              }}
            >
              <AudioVisualizer active={!settings.is_paused} color={accentColor} size="lg" />
            </div>

            <div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    backgroundColor: settings.is_paused ? '#534840' : '#6BCF7F',
                    boxShadow: settings.is_paused ? 'none' : '0 0 6px #6BCF7F88',
                    animation: settings.is_paused ? 'none' : 'pulse-dot 2s ease-in-out infinite',
                  }}
                />
                <span
                  className="uppercase tracking-widest text-[10px]"
                  style={{ color: settings.is_paused ? '#534840' : '#6BCF7F', fontFamily: 'var(--font-mono)' }}
                >
                  {settings.is_paused ? 'paused' : 'live'}
                </span>
              </div>

              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.8rem',
                  fontWeight: 600,
                  color: accentColor,
                  lineHeight: 1.2,
                }}
              >
                {currentStation.name}
              </h2>
              {currentStation.description && (
                <p
                  className="mt-2 max-w-xs mx-auto leading-relaxed"
                  style={{ color: '#8A7D6B', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}
                >
                  {currentStation.description}
                </p>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col items-center gap-5">
            <button
              onClick={handleTogglePause}
              className="w-14 h-14 rounded-full transition-all hover:scale-110 active:scale-95"
              style={{
                backgroundColor: `${accentColor}18`,
                border: `1.5px solid ${accentColor}55`,
                color: accentColor,
                fontSize: '1.1rem',
              }}
            >
              {settings.is_paused ? '▶' : '⏸'}
            </button>
            <VolumeControl volume={settings.volume} onChange={handleVolumeChange} />
          </div>

          {/* Up next */}
          {nextInfo && (
            <div
              className="pt-5"
              style={{ borderTop: '1px solid #2E2317' }}
            >
              <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: '#3A2F20', fontFamily: 'var(--font-mono)' }}>
                Up next
              </p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                <span style={{ color: nextInfo.station.color }}>{nextInfo.station.name}</span>
                <span style={{ color: '#534840' }}> · {nextInfo.label}</span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Manage link */}
      <a
        href="/"
        className="absolute bottom-5 right-5 text-[10px] transition-colors"
        style={{ color: '#3A2F20', fontFamily: 'var(--font-mono)' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#8A7D6B'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#3A2F20'; }}
      >
        schedule →
      </a>
    </div>
  );
}
