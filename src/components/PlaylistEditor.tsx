import { useState } from 'react';
import type { Station, Playlist } from '../lib/stations';

interface PlaylistEditorProps {
  playlist?: Playlist; // undefined = creating new
  stations: Station[];
  onSave: (name: string, stationIds: string[]) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClose: () => void;
}

export function PlaylistEditor({ playlist, stations, onSave, onDelete, onClose }: PlaylistEditorProps) {
  const [name, setName] = useState(playlist?.name ?? '');
  const [stationIds, setStationIds] = useState<string[]>(playlist?.stationIds ?? []);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const selectedStations = stationIds
    .map((id) => stations.find((s) => s.id === id))
    .filter(Boolean) as Station[];

  const unselected = stations.filter((s) => !stationIds.includes(s.id));

  function addStation(id: string) {
    setStationIds((prev) => [...prev, id]);
  }

  function removeStation(index: number) {
    setStationIds((prev) => prev.filter((_, i) => i !== index));
  }

  function moveUp(index: number) {
    if (index === 0) return;
    setStationIds((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }

  function moveDown(index: number) {
    setStationIds((prev) => {
      if (index === prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }

  async function handleSave() {
    if (!name.trim() || stationIds.length === 0) return;
    setSaving(true);
    try {
      await onSave(name.trim(), stationIds);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    setSaving(true);
    try {
      await onDelete();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(12, 8, 4, 0.85)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl p-5 flex flex-col gap-5 animate-slide-up max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: '#1F1710', border: '1px solid #3A2F20' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 style={{ fontFamily: 'var(--font-display)', color: '#F0E6D3', fontSize: '1.1rem', fontWeight: 600 }}>
            {playlist ? 'Edit playlist' : 'New playlist'}
          </h2>
          <button onClick={onClose} style={{ color: '#534840', fontSize: '1.2rem' }}>×</button>
        </div>

        {/* Name */}
        <div>
          <label style={{ fontSize: '0.65rem', color: '#8A7D6B', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: '6px' }}>
            Name
          </label>
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Morning Vibes"
            style={{
              width: '100%', backgroundColor: '#271E14', border: '1px solid #3A2F20',
              borderRadius: '8px', padding: '8px 12px', color: '#F0E6D3',
              fontFamily: 'var(--font-mono)', fontSize: '0.85rem', outline: 'none',
            }}
            onFocus={(e) => { e.target.style.borderColor = '#E4A530'; }}
            onBlur={(e) => { e.target.style.borderColor = '#3A2F20'; }}
          />
        </div>

        {/* Selected stations (ordered) */}
        <div>
          <label style={{ fontSize: '0.65rem', color: '#8A7D6B', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: '6px' }}>
            Stations in order {stationIds.length > 0 && <span style={{ color: '#534840' }}>— {stationIds.length} hr{stationIds.length !== 1 ? 's' : ''} when scheduled</span>}
          </label>
          {selectedStations.length === 0 ? (
            <p style={{ color: '#534840', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', padding: '8px 0' }}>
              Add stations from below ↓
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {selectedStations.map((station, i) => (
                <div
                  key={`${station.id}-${i}`}
                  className="flex items-center gap-2 rounded-lg px-3 py-2"
                  style={{ backgroundColor: '#271E14', border: '1px solid #2E2317' }}
                >
                  <span style={{ color: '#534840', fontSize: '0.65rem', fontFamily: 'var(--font-mono)', width: '16px', textAlign: 'right' }}>
                    {i + 1}
                  </span>
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: station.color }} />
                  <span style={{ color: '#F0E6D3', fontSize: '0.8rem', fontFamily: 'var(--font-mono)', flex: 1, minWidth: 0 }} className="truncate">
                    {station.name}
                  </span>
                  <div className="flex items-center gap-1 ml-auto">
                    <button onClick={() => moveUp(i)} disabled={i === 0} style={{ color: i === 0 ? '#534840' : '#8A7D6B', fontSize: '0.7rem', padding: '2px 4px', lineHeight: 1 }}>↑</button>
                    <button onClick={() => moveDown(i)} disabled={i === stationIds.length - 1} style={{ color: i === stationIds.length - 1 ? '#534840' : '#8A7D6B', fontSize: '0.7rem', padding: '2px 4px', lineHeight: 1 }}>↓</button>
                    <button onClick={() => removeStation(i)} style={{ color: '#534840', fontSize: '0.8rem', padding: '2px 4px', lineHeight: 1 }} className="hover:text-red-400 transition-colors">×</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add from library */}
        {unselected.length > 0 && (
          <div>
            <label style={{ fontSize: '0.65rem', color: '#8A7D6B', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: '6px' }}>
              Add from library
            </label>
            <div className="flex flex-col gap-1.5">
              {unselected.map((station) => (
                <button
                  key={station.id}
                  onClick={() => addStation(station.id)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors"
                  style={{ backgroundColor: '#271E14', border: '1px solid #2E2317' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = station.color + '55'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#2E2317'; }}
                >
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: station.color }} />
                  <span style={{ color: '#8A7D6B', fontSize: '0.8rem', fontFamily: 'var(--font-mono)', flex: 1 }} className="truncate">
                    {station.name}
                  </span>
                  <span style={{ color: '#534840', fontSize: '0.75rem' }}>+</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleSave}
            disabled={saving || !name.trim() || stationIds.length === 0}
            className="flex-1 py-2 rounded-lg font-medium transition-all text-sm"
            style={{
              backgroundColor: name.trim() && stationIds.length > 0 ? '#E4A530' : '#2E2317',
              color: name.trim() && stationIds.length > 0 ? '#17110C' : '#534840',
              fontFamily: 'var(--font-mono)',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Saving…' : playlist ? 'Save changes' : 'Create playlist'}
          </button>

          {playlist && onDelete && (
            confirmDelete ? (
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-lg text-sm transition-colors"
                style={{ backgroundColor: '#3B1515', color: '#E05757', fontFamily: 'var(--font-mono)', border: '1px solid #5A2020' }}
              >
                Confirm delete
              </button>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="px-4 py-2 rounded-lg text-sm transition-colors"
                style={{ color: '#534840', fontFamily: 'var(--font-mono)', border: '1px solid #2E2317' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#E05757'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#534840'; }}
              >
                Delete
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
