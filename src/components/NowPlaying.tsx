import type { Station } from '../lib/stations';
import { AudioVisualizer } from './AudioVisualizer';

interface NowPlayingProps {
  station: Station | null;
  isPlaying: boolean;
  compact?: boolean;
}

export function NowPlaying({ station, isPlaying, compact = false }: NowPlayingProps) {
  if (!station) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div
          className="w-2 h-2 rounded-full animate-pulse"
          style={{ backgroundColor: isPlaying ? '#4ade80' : '#6b7280' }}
        />
        <span className="text-sm text-gray-300 font-mono">{station.name}</span>
        {isPlaying && <AudioVisualizer active={isPlaying} color={station.color} size="sm" />}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div
        className="w-3 h-3 rounded-full"
        style={{
          backgroundColor: isPlaying ? '#4ade80' : '#6b7280',
          boxShadow: isPlaying ? '0 0 8px #4ade80' : 'none',
          animation: isPlaying ? 'pulse 2s infinite' : 'none',
        }}
      />
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-widest">Now Playing</p>
        <p className="text-amber-400 font-mono font-semibold">{station.name}</p>
      </div>
      {isPlaying && <AudioVisualizer active={isPlaying} color={station.color} size="sm" />}
    </div>
  );
}
