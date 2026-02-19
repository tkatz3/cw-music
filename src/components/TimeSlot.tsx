import { useDroppable } from '@dnd-kit/core';
import type { Station } from '../lib/stations';

interface TimeSlotProps {
  day: number;
  hour: number;
  stationId: string | null;
  stations: Station[];
  previewStatus?: 'adding' | 'removing' | null;
  showResizeHandle?: boolean;
  onClear: () => void;
  onResizeStart?: (e: React.PointerEvent) => void;
}

export function TimeSlot({
  day, hour, stationId, stations,
  previewStatus, showResizeHandle,
  onClear, onResizeStart,
}: TimeSlotProps) {
  const id = `slot-${day}-${hour}`;
  const { setNodeRef, isOver } = useDroppable({ id, data: { day, hour } });

  const station = stationId ? stations.find((s) => s.id === stationId) : null;
  const isOrphaned = !!stationId && !station;

  // Preview: a cell being added in a resize drag
  if (previewStatus === 'adding' && !station) {
    // Find the station from the drag via parent — we don't have it here,
    // just render a neutral preview
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
      onClick={() => { if (stationId && !onResizeStart) onClear(); else if (stationId) onClear(); }}
      className="h-[38px] rounded transition-all relative overflow-visible select-none"
      style={{
        border: isOver
          ? '1.5px solid #E4A530'
          : previewStatus === 'removing'
          ? '1px solid #E0575744'
          : station
          ? `1px solid ${station.color}44`
          : isOrphaned
          ? '1px solid #534840'
          : '1px solid #2E2317',
        backgroundColor: isOver
          ? '#E4A53015'
          : previewStatus === 'removing'
          ? '#E0575712'
          : station
          ? `${station.color}18`
          : isOrphaned
          ? 'transparent'
          : '#1F171008',
        cursor: stationId ? 'pointer' : 'default',
        transform: isOver ? 'scale(1.02)' : 'scale(1)',
        zIndex: isOver ? 1 : 'auto',
      }}
      title={
        isOrphaned
          ? 'Station removed from library — click to clear'
          : station
          ? `${station.name} · click to clear`
          : 'Drop a station or playlist here'
      }
    >
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

      {isOrphaned && (
        <div className="flex items-center h-full px-1.5">
          <span style={{ color: '#534840', fontFamily: 'var(--font-mono)', fontSize: '9px' }}>
            removed
          </span>
        </div>
      )}

      {/* Resize handle — shown on the last slot of a run */}
      {showResizeHandle && station && (
        <div
          className="absolute -bottom-[4px] left-1/2 -translate-x-1/2 z-20 flex items-center justify-center"
          style={{ width: '32px', height: '10px', cursor: 'ns-resize' }}
          onPointerDown={(e) => onResizeStart?.(e)}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="rounded-full"
            style={{ width: '20px', height: '3px', backgroundColor: `${station.color}99` }}
          />
        </div>
      )}
    </div>
  );
}
