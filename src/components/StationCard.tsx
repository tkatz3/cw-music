import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Station } from '../lib/stations';

interface StationCardProps {
  station: Station;
  onRemove: () => void;
}

export function StationCard({ station, onRemove }: StationCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `station-${station.id}`,
    data: { stationId: station.id },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="group touch-none select-none">
      <div
        className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors"
        style={{ backgroundColor: '#271E14', border: '1px solid #2E2317' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = `${station.color}44`; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#2E2317'; }}
      >
        {/* Drag area */}
        <div
          {...listeners}
          {...attributes}
          className="flex items-center gap-2.5 flex-1 min-w-0 cursor-grab active:cursor-grabbing"
        >
          <div
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: station.color, boxShadow: `0 0 6px ${station.color}55` }}
          />
          <div className="min-w-0">
            <p className="text-xs font-medium truncate" style={{ color: '#F0E6D3', fontFamily: 'var(--font-mono)' }}>
              {station.name}
            </p>
            {station.description && (
              <p className="text-[10px] mt-0.5 truncate" style={{ color: '#534840', fontFamily: 'var(--font-mono)' }}>
                {station.description}
              </p>
            )}
          </div>
        </div>

        {/* Remove */}
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
          style={{ color: '#534840', fontSize: '0.9rem', lineHeight: 1 }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#E05757'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#534840'; }}
          title="Remove from library"
        >
          ×
        </button>
      </div>
    </div>
  );
}
