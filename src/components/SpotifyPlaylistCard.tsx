import { useDraggable } from '@dnd-kit/core';
import type { SpotifyPlaylistRecord } from '../lib/stations';

const SPOTIFY_GREEN = '#1DB954';

interface SpotifyPlaylistCardProps {
  playlist: SpotifyPlaylistRecord;
  onRemove: () => void;
}

export function SpotifyPlaylistCard({ playlist, onRemove }: SpotifyPlaylistCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `spotify-${playlist.id}`,
    data: { spotifyPlaylistId: playlist.id },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-grab active:cursor-grabbing select-none transition-all"
      style={{
        backgroundColor: isDragging ? `${SPOTIFY_GREEN}22` : '#271E14',
        border: `1px solid ${SPOTIFY_GREEN}${isDragging ? '88' : '44'}`,
        opacity: isDragging ? 0.7 : 1,
        transform: isDragging ? 'scale(0.97)' : 'scale(1)',
      }}
    >
      {playlist.image_url ? (
        <img
          src={playlist.image_url}
          alt=""
          className="w-6 h-6 rounded flex-shrink-0 object-cover"
          style={{ border: `1px solid ${SPOTIFY_GREEN}33` }}
        />
      ) : (
        <div
          className="w-6 h-6 rounded flex-shrink-0 flex items-center justify-center text-[10px]"
          style={{ backgroundColor: `${SPOTIFY_GREEN}22`, color: SPOTIFY_GREEN }}
        >
          ♪
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium truncate" style={{ color: '#F0E6D3', fontFamily: 'var(--font-mono)' }}>
          {playlist.name}
        </p>
        <p className="text-[9px]" style={{ color: '#534840', fontFamily: 'var(--font-mono)' }}>
          {playlist.track_count} tracks
        </p>
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        onPointerDown={(e) => e.stopPropagation()}
        className="flex-shrink-0 w-4 h-4 flex items-center justify-center text-[12px] leading-none transition-colors"
        style={{ color: '#534840' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#E05757'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#534840'; }}
        title="Remove playlist"
      >
        ×
      </button>
    </div>
  );
}
