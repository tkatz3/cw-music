import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Playlist, Station } from '../lib/stations';

interface PlaylistCardProps {
  playlist: Playlist;
  stations: Station[];
  onEdit: () => void;
}

export function PlaylistCard({ playlist, stations, onEdit }: PlaylistCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `playlist-${playlist.id}`,
    data: { playlistId: playlist.id },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };

  const stationCount = playlist.stationIds.length;
  const previewStations = playlist.stationIds
    .slice(0, 3)
    .map((id) => stations.find((s) => s.id === id))
    .filter(Boolean) as Station[];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-lg group touch-none select-none"
      {...attributes}
    >
      <div
        className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors"
        style={{ backgroundColor: '#271E14', border: `1px solid ${playlist.color}33` }}
      >
        {/* Drag handle + content */}
        <div
          {...listeners}
          className="flex items-center gap-2.5 flex-1 min-w-0 cursor-grab active:cursor-grabbing"
        >
          {/* Stack of colored dots */}
          <div className="flex flex-col gap-[3px] flex-shrink-0">
            {previewStations.length > 0 ? (
              previewStations.map((s, i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
              ))
            ) : (
              <>
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: playlist.color + '88' }} />
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: playlist.color + '55' }} />
              </>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium truncate" style={{ color: '#F0E6D3', fontFamily: 'var(--font-mono)' }}>
              {playlist.name}
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: '#534840', fontFamily: 'var(--font-mono)' }}>
              {stationCount} station{stationCount !== 1 ? 's' : ''} · {stationCount}h when scheduled
            </p>
          </div>
        </div>

        {/* Edit button */}
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
          style={{ color: '#534840', fontSize: '0.65rem', fontFamily: 'var(--font-mono)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#E4A530'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#534840'; }}
          title="Edit playlist"
        >
          edit
        </button>
      </div>
    </div>
  );
}
