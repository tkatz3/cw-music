import { useDroppable } from '@dnd-kit/core';
import type { Station, SpotifyPlaylistRecord } from '../lib/stations';
import type { ScheduleBlock } from '../lib/schedule';

const SPOTIFY_GREEN = '#1DB954';

interface TimeSlotProps {
  day: number;
  hour: number;
  block: ScheduleBlock | null;
  stations: Station[];
  spotifyPlaylists: SpotifyPlaylistRecord[];
  previewStatus?: 'adding' | 'removing' | null;
  showResizeHandle?: boolean;
  onClear: () => void;
  onResizeStart?: (e: React.PointerEvent) => void;
}

export function TimeSlot({
  day, hour, block, stations, spotifyPlaylists,
  previewStatus, showResizeHandle,
  onClear, onResizeStart,
}: TimeSlotProps) {
  const id = `slot-${day}-${hour}`;
  const { setNodeRef, isOver } = useDroppable({ id, data: { day, hour } });

  const blockType = block?.type ?? 'somafm';
  const isSpotify = blockType === 'spotify';

  const station = (!isSpotify && block?.station_id)
    ? stations.find((s) => s.id === block.station_id)
    : null;

  const spotifyPlaylist = (isSpotify && block?.spotify_uri)
    ? spotifyPlaylists.find((p) => p.uri === block.spotify_uri)
    : null;

  const isOrphaned = !!block && !isSpotify && !!block.station_id && !station;

  const accentColor = isSpotify ? SPOTIFY_GREEN : station?.color;

  if (previewStatus === 'adding' && !block) {
    return (
      <div
        ref={setNodeRef}
        data-slot-day={day}
        data-slot-hour={hour}
        className="h-[38px] rounded transition-all"
        style={{ border: '1px dashed #E4A53066', backgroundColor: '#E4A53010' }}
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      data-slot-day={day}
      data-slot-hour={hour}
      onClick={() => { if (block) onClear(); }}
      className="h-[38px] rounded transition-all relative overflow-visible select-none"
      style={{
        border: isOver
          ? '1.5px solid #E4A530'
          : previewStatus === 'removing'
          ? '1px solid #E0575744'
          : accentColor
          ? `1px solid ${accentColor}44`
          : isOrphaned
          ? '1px solid #534840'
          : '1px solid #2E2317',
        backgroundColor: isOver
          ? '#E4A53015'
          : previewStatus === 'removing'
          ? '#E0575712'
          : accentColor
          ? `${accentColor}18`
          : isOrphaned
          ? 'transparent'
          : '#1F171008',
        cursor: block ? 'pointer' : 'default',
        transform: isOver ? 'scale(1.02)' : 'scale(1)',
        zIndex: isOver ? 1 : 'auto',
      }}
      title={
        isOrphaned
          ? 'Station removed from library — click to clear'
          : isSpotify
          ? `${block?.spotify_name ?? 'Spotify'} · click to clear`
          : station
          ? `${station.name} · click to clear`
          : 'Drop a station or playlist here'
      }
    >
      {/* SomaFM station */}
      {station && (
        <div className="flex items-center h-full px-1.5 gap-1.5 overflow-hidden">
          <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ backgroundColor: station.color }} />
          <span
            className="text-[10px] font-medium truncate leading-none"
            style={{ color: station.color, fontFamily: 'var(--font-mono)' }}
          >
            {station.name}
          </span>
        </div>
      )}

      {/* Spotify block */}
      {isSpotify && block && (
        <div className="flex items-center h-full px-1.5 gap-1.5 overflow-hidden">
          {spotifyPlaylist?.image_url ? (
            <img
              src={spotifyPlaylist.image_url}
              alt=""
              className="w-3 h-3 rounded flex-shrink-0 object-cover"
            />
          ) : (
            <span className="text-[9px] leading-none flex-shrink-0" style={{ color: SPOTIFY_GREEN }}>♪</span>
          )}
          <span
            className="text-[10px] font-medium truncate leading-none"
            style={{ color: SPOTIFY_GREEN, fontFamily: 'var(--font-mono)' }}
          >
            {block.spotify_name ?? 'Spotify'}
          </span>
        </div>
      )}

      {/* Orphaned SomaFM station */}
      {isOrphaned && (
        <div className="flex items-center h-full px-1.5">
          <span style={{ color: '#534840', fontFamily: 'var(--font-mono)', fontSize: '9px' }}>
            removed
          </span>
        </div>
      )}

      {/* Resize handle — shown on the last slot of a run */}
      {showResizeHandle && accentColor && (
        <div
          className="absolute -bottom-[4px] left-1/2 -translate-x-1/2 z-20 flex items-center justify-center"
          style={{ width: '32px', height: '10px', cursor: 'ns-resize' }}
          onPointerDown={(e) => onResizeStart?.(e)}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="rounded-full"
            style={{ width: '20px', height: '3px', backgroundColor: `${accentColor}99` }}
          />
        </div>
      )}
    </div>
  );
}
