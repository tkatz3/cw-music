import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Station } from '../lib/stations';

interface StationCardProps {
  station: Station;
}

export function StationCard({ station }: StationCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `station-${station.id}`,
    data: { stationId: station.id },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="flex items-start gap-3 p-3 rounded-lg bg-gray-800/60 border border-gray-700/50 cursor-grab active:cursor-grabbing hover:border-gray-500 transition-colors touch-none select-none"
    >
      <div
        className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
        style={{ backgroundColor: station.color }}
      />
      <div className="min-w-0">
        <p className="text-sm font-mono font-semibold text-white truncate">{station.name}</p>
        <p className="text-xs text-gray-400 leading-tight mt-0.5 line-clamp-2">{station.description}</p>
      </div>
    </div>
  );
}
