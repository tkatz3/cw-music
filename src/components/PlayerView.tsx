import { useEffect, useRef, useState } from 'react';
import { useSchedule } from '../hooks/useSchedule';
import { useSettings } from '../hooks/useSettings';
import { useStations } from '../hooks/useStations';
import { useSpotifyPlaylists } from '../hooks/useSpotifyPlaylists';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { useSpotifyPlayer } from '../hooks/useSpotifyPlayer';
import { getCurrentPlayback, getNextStation } from '../lib/schedule';
import type { ScheduleBlock } from '../lib/schedule';
import { AudioVisualizer } from './AudioVisualizer';
import { VolumeControl } from './VolumeControl';

const SPOTIFY_GREEN = '#1DB954';

function formatTime(date: Date) {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}
function formatDate(date: Date) {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function isInBlock(blocks: ScheduleBlock[], atTime: Date): boolean {
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

export function PlayerView() {
  const { blocks } = useSchedule();
  const { settings, updateSetting } = useSettings();
  const { stations } = useStations();
  const { playlists: spotifyPlaylists } = useSpotifyPlaylists();
  const audio = useAudioPlayer();

  const [started, setStarted] = useState(false);
  const [now, setNow] = useState(new Date());
  const [cursorVisible, setCursorVisible] = useState(true);
  const cursorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const prevInBlock = useRef<boolean | null>(null);
  const prevMinute = useRef<number>(-1);

  // Spotify player: enabled once user has clicked start and Spotify is configured
  const hasSpotifyToken = !!settings.spotify_refresh_token && !!settings.spotify_connected;
  const spotifyPlayer = useSpotifyPlayer(started && hasSpotifyToken);

  // Resolve current playback source
  const currentPlayback = getCurrentPlayback(
    blocks, stations, spotifyPlaylists,
    settings.default_station, settings.default_type
  );

  const isSpotifySource = currentPlayback?.type === 'spotify';
  const currentStation = currentPlayback?.type === 'somafm' ? currentPlayback.station : null;
  const currentSpotifyUri = currentPlayback?.type === 'spotify' ? currentPlayback.uri : null;
  const accentColor = isSpotifySource ? SPOTIFY_GREEN : (currentStation?.color ?? '#E4A530');

  const nextInfo = getNextStation(blocks, stations, settings.default_station);

  // Clock tick
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Follow-schedule: auto-play/pause at block boundaries (once per minute)
  useEffect(() => {
    if (!settings.follow_schedule) {
      prevInBlock.current = null;
      prevMinute.current = -1;
      return;
    }

    const minute = now.getHours() * 60 + now.getMinutes();
    if (minute === prevMinute.current && prevInBlock.current !== null) return;
    prevMinute.current = minute;

    const inBlock = isInBlock(blocks, now);

    if (prevInBlock.current === null) {
      prevInBlock.current = inBlock;
      if (inBlock && settings.is_paused) updateSetting('is_paused', false);
      else if (!inBlock && !settings.is_paused) updateSetting('is_paused', true);
      return;
    }

    if (inBlock !== prevInBlock.current) {
      prevInBlock.current = inBlock;
      updateSetting('is_paused', !inBlock);
    }
  }, [now, settings.follow_schedule, blocks]);

  // Auto-start SomaFM if follow_schedule and a SomaFM block is active
  useEffect(() => {
    if (!settings.follow_schedule || audio.started || !currentStation) return;
    if (!settings.is_paused && isInBlock(blocks, new Date())) {
      audio.start(currentStation.stream_url, settings.volume);
    }
  }, [settings.follow_schedule, settings.is_paused, audio.started, currentStation?.id, blocks]);

  // Source switching: runs when playback type or identity changes
  useEffect(() => {
    if (!started) return;

    if (isSpotifySource) {
      // Mute SomaFM
      if (audio.started) audio.setPaused(true);
      // Spotify playback triggered by spotifyPlayer.state.isReady effect
    } else if (currentStation) {
      // Pause Spotify
      if (spotifyPlayer.state.isReady) {
        spotifyPlayer.pause().catch(console.error);
      }
      // Resume/switch SomaFM
      if (audio.started) {
        if (audio.currentUrl !== currentStation.stream_url) {
          audio.switchStream(currentStation.stream_url);
        }
        audio.setPaused(settings.is_paused);
      }
    }
  }, [started, isSpotifySource, currentStation?.id, currentSpotifyUri]);

  // When Spotify player becomes ready, start playing if not paused
  useEffect(() => {
    if (!spotifyPlayer.state.isReady || !started || settings.is_paused) return;
    if (currentPlayback?.type === 'spotify') {
      spotifyPlayer.playPlaylist(currentPlayback.uri).catch(console.error);
    }
  }, [spotifyPlayer.state.isReady]);

  // Sync volume
  useEffect(() => {
    audio.setVolume(settings.volume);
    spotifyPlayer.setVolume(settings.volume);
  }, [settings.volume]);

  // Sync pause state
  useEffect(() => {
    if (!audio.started && !started) return;

    if (isSpotifySource && spotifyPlayer.state.isReady) {
      if (settings.is_paused) spotifyPlayer.pause().catch(console.error);
      else spotifyPlayer.resume().catch(console.error);
    } else if (!isSpotifySource && audio.started) {
      audio.setPaused(settings.is_paused);
    }
  }, [settings.is_paused, audio.started, started, isSpotifySource]);

  // Wake lock
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

  // Auto-hide cursor
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
    setStarted(true);
    if (!isSpotifySource && currentStation) {
      audio.start(currentStation.stream_url, settings.volume);
    }
    // Spotify SDK initializes via useSpotifyPlayer once started=true
  }

  async function handleTogglePause() {
    const next = !settings.is_paused;
    if (isSpotifySource && spotifyPlayer.state.isReady) {
      if (next) await spotifyPlayer.pause();
      else await spotifyPlayer.resume();
    } else {
      audio.setPaused(next);
    }
    await updateSetting('is_paused', next);
  }

  async function handleVolumeChange(v: number) {
    audio.setVolume(v);
    spotifyPlayer.setVolume(v);
    await updateSetting('volume', v);
  }

  const notStarted = isSpotifySource ? !started : !audio.started;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 text-center relative overflow-hidden"
      style={{
        backgroundColor: '#17110C',
        cursor: cursorVisible ? 'default' : 'none',
      }}
    >
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-2000"
        style={{
          background: `radial-gradient(ellipse 60% 50% at 50% 60%, ${accentColor}0C 0%, transparent 70%)`,
        }}
      />

      {/* Grain overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      {!currentPlayback ? (
        /* No stations/playlists configured */
        <div className="space-y-4 relative z-10 animate-fade-in">
          <h1 style={{ fontFamily: 'var(--font-display)', color: '#E4A530', fontSize: '2rem', fontWeight: 700 }}>
            Culture Works
          </h1>
          <p style={{ color: '#534840', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
            No stations configured.
          </p>
          <a href="/" style={{ color: '#E4A530', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
            Open the scheduler →
          </a>
        </div>

      ) : notStarted ? (
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

          <div className="space-y-1">
            <p style={{ color: '#534840', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Now scheduled
            </p>
            {isSpotifySource ? (
              <>
                <p style={{ fontFamily: 'var(--font-display)', color: SPOTIFY_GREEN, fontSize: '1.3rem', fontWeight: 600 }}>
                  {(currentPlayback as { name: string }).name}
                </p>
                <p style={{ color: '#534840', fontFamily: 'var(--font-mono)', fontSize: '0.65rem' }}>via Spotify</p>
              </>
            ) : (
              <p style={{ fontFamily: 'var(--font-display)', color: accentColor, fontSize: '1.3rem', fontWeight: 600 }}>
                {currentStation!.name}
              </p>
            )}
          </div>

          {isSpotifySource && !hasSpotifyToken ? (
            <div className="space-y-3">
              <p style={{ color: '#E05757', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                Spotify not connected
              </p>
              <a href="/" style={{ color: '#E4A530', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                Connect in Settings →
              </a>
            </div>
          ) : (
            <>
              <button
                onClick={handleStart}
                className="transition-all hover:scale-105 active:scale-95 px-10 py-4 rounded-2xl"
                style={{
                  backgroundColor: accentColor,
                  color: isSpotifySource ? '#000' : '#17110C',
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
            </>
          )}
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
            <p className="mt-2" style={{ color: '#534840', fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>
              {formatDate(now)}
            </p>
          </div>

          {/* Visualizer + info */}
          <div className="space-y-5">
            {isSpotifySource && spotifyPlayer.state.currentTrack?.albumArt ? (
              <img
                src={spotifyPlayer.state.currentTrack.albumArt}
                alt=""
                className="w-20 h-20 rounded-lg mx-auto object-cover"
                style={{ boxShadow: `0 0 40px ${SPOTIFY_GREEN}33`, border: `1px solid ${SPOTIFY_GREEN}44` }}
              />
            ) : (
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
            )}

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

              {isSpotifySource ? (
                /* Spotify now playing */
                <div>
                  <h2
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '1.6rem',
                      fontWeight: 600,
                      color: SPOTIFY_GREEN,
                      lineHeight: 1.2,
                    }}
                  >
                    {spotifyPlayer.state.currentTrack?.name ?? (currentPlayback as { name: string }).name}
                  </h2>
                  {spotifyPlayer.state.currentTrack?.artist && (
                    <p className="mt-1.5 max-w-xs mx-auto leading-relaxed" style={{ color: '#8A7D6B', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                      {spotifyPlayer.state.currentTrack.artist}
                    </p>
                  )}
                  <p className="mt-2" style={{ color: '#534840', fontFamily: 'var(--font-mono)', fontSize: '0.65rem' }}>
                    from {(currentPlayback as { name: string }).name}
                  </p>
                  {spotifyPlayer.state.error && (
                    <p className="mt-2" style={{ color: '#E05757', fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>
                      {spotifyPlayer.state.error}
                    </p>
                  )}
                </div>
              ) : (
                /* SomaFM now playing */
                <div>
                  <h2
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '1.8rem',
                      fontWeight: 600,
                      color: accentColor,
                      lineHeight: 1.2,
                    }}
                  >
                    {currentStation!.name}
                  </h2>
                  {currentStation!.description && (
                    <p className="mt-2 max-w-xs mx-auto leading-relaxed" style={{ color: '#8A7D6B', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                      {currentStation!.description}
                    </p>
                  )}
                </div>
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

          {/* Up next (SomaFM only) */}
          {nextInfo && !isSpotifySource && (
            <div className="pt-5" style={{ borderTop: '1px solid #2E2317' }}>
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
