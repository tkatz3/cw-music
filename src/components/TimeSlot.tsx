import { useDroppable } from '@dnd-kit/core';
import { STATIONS } from '../lib/stations';

interface TimeSlotProps {
  day: number;
  hour: number;
  stationId: string | null;
  onClear: () => void;
}

export function TimeSlot({ day, hour, stationId, onClear }: TimeSlotProps) {
  const id = `slot-${day}-${hour}`;
  const { setNodeRef, isOver } = useDroppable({ id, data: { day, hour } });

  const station = stationId ? STATIONS.find((s) => s.id === stationId) : null;

  return (
    <div
      ref={setNodeRef}
      onClick={() => { if (stationId) onClear(); }}
      className={`
        h-10 rounded border transition-all relative overflow-hidden
        ${isOver ? 'border-amber-400 bg-amber-400/10 scale-[1.02]' : ''}
        ${station ? 'cursor-pointer' : 'cursor-default'}
        ${!station && !isOver ? 'border-gray-700/40 bg-gray-800/20 hover:border-gray-600/60' : ''}
        ${station && !isOver ? 'border-transparent' : ''}
      `}
      style={
        station
          ? {
              backgroundColor: `${station.color}22`,
              borderColor: `${station.color}55`,
            }
          : {}
      }
      title={station ? `${station.name} — click to clear` : ''}
    >
      {station && (
        <div className="flex items-center h-full px-1.5 gap-1.5">
          <div
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: station.color }}
          />
          <span
            className="text-[10px] font-mono font-semibold truncate leading-none"
            style={{ color: station.color }}
          >
            {station.name}
          </span>
        </div>
      )}
    </div>
  );
}
