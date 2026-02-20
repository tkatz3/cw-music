import { useState } from 'react';
import type { Station, SpotifyPlaylistRecord } from '../lib/stations';
import type { Settings } from '../hooks/useSettings';
import { SpotifyConnect } from './SpotifyConnect';

interface SettingsPanelProps {
  settings: Settings;
  stations: Station[];
  spotifyPlaylists: SpotifyPlaylistRecord[];
  onUpdateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => Promise<void>;
  onClose: () => void;
}

const inputStyle = {
  width: '100%', backgroundColor: '#1F1710', border: '1px solid #2E2317',
  borderRadius: '8px', padding: '8px 12px', color: '#F0E6D3',
  fontFamily: 'var(--font-mono)', fontSize: '0.8rem', outline: 'none',
};

const labelStyle = {
  fontSize: '0.65rem', color: '#8A7D6B', letterSpacing: '0.1em',
  textTransform: 'uppercase' as const, fontFamily: 'var(--font-mono)',
  display: 'block', marginBottom: '6px',
};

export function SettingsPanel({ settings, stations, spotifyPlaylists, onUpdateSetting, onClose }: SettingsPanelProps) {
  const [changingPin, setChangingPin] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinSuccess, setPinSuccess] = useState('');

  async function handlePinChange() {
    setPinError(''); setPinSuccess('');
    if (currentPin !== settings.pin) { setPinError('Current PIN is incorrect.'); return; }
    if (!/^\d{4}$/.test(newPin)) { setPinError('New PIN must be exactly 4 digits.'); return; }
    if (newPin !== confirmPin) { setPinError('PINs do not match.'); return; }
    await onUpdateSetting('pin', newPin);
    setPinSuccess('PIN updated!');
    setCurrentPin(''); setNewPin(''); setConfirmPin('');
    setChangingPin(false);
  }

  const hasDefaultOptions = stations.length > 0 || spotifyPlaylists.length > 0;

  async function handleDefaultChange(value: string, type: 'somafm' | 'spotify') {
    await onUpdateSetting('default_station', value);
    await onUpdateSetting('default_type', type);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(12, 8, 4, 0.85)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl p-6 flex flex-col gap-6 shadow-2xl animate-slide-up overflow-y-auto"
        style={{ backgroundColor: '#1F1710', border: '1px solid #3A2F20', maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 style={{ fontFamily: 'var(--font-display)', color: '#F0E6D3', fontSize: '1.1rem', fontWeight: 600 }}>
            Settings
          </h2>
          <button
            onClick={onClose}
            style={{ color: '#534840', fontSize: '1.2rem', lineHeight: 1 }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#F0E6D3'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#534840'; }}
          >
            ×
          </button>
        </div>

        {/* Spotify Connection */}
        <div>
          <label style={labelStyle}>Spotify</label>
          <SpotifyConnect settings={settings} />
        </div>

        {/* Default Fallback */}
        <div>
          <label style={labelStyle}>Default fallback</label>
          {!hasDefaultOptions ? (
            <p style={{ color: '#534840', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
              No stations or playlists in library yet.
            </p>
          ) : (
            <select
              value={`${settings.default_type}::${settings.default_station}`}
              onChange={(e) => {
                const [type, id] = e.target.value.split('::') as ['somafm' | 'spotify', string];
                handleDefaultChange(id, type);
              }}
              style={{ ...inputStyle, cursor: 'pointer' }}
              onFocus={(e) => { e.target.style.borderColor = '#E4A530'; }}
              onBlur={(e) => { e.target.style.borderColor = '#2E2317'; }}
            >
              {stations.length > 0 && (
                <optgroup label="Radio Stations" style={{ backgroundColor: '#1F1710' }}>
                  {stations.map((s) => (
                    <option key={s.id} value={`somafm::${s.id}`} style={{ backgroundColor: '#1F1710' }}>
                      {s.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {spotifyPlaylists.length > 0 && (
                <optgroup label="Spotify Playlists" style={{ backgroundColor: '#1F1710' }}>
                  {spotifyPlaylists.map((p) => (
                    <option key={p.id} value={`spotify::${p.id}`} style={{ backgroundColor: '#1F1710' }}>
                      ♪ {p.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          )}
          <p style={{ color: '#3A2F20', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', marginTop: '4px' }}>
            Plays when nothing is scheduled
          </p>
        </div>

        {/* PIN */}
        <div>
          <label style={labelStyle}>PIN</label>
          {!changingPin ? (
            <button
              onClick={() => setChangingPin(true)}
              style={{ color: '#E4A530', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#F0BC6A'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#E4A530'; }}
            >
              Change PIN →
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              {[
                { placeholder: 'Current PIN', value: currentPin, setter: setCurrentPin },
                { placeholder: 'New PIN (4 digits)', value: newPin, setter: setNewPin },
                { placeholder: 'Confirm new PIN', value: confirmPin, setter: setConfirmPin },
              ].map(({ placeholder, value, setter }) => (
                <input
                  key={placeholder}
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder={placeholder}
                  value={value}
                  onChange={(e) => setter(e.target.value.replace(/\D/g, ''))}
                  style={inputStyle}
                  onFocus={(e) => { e.target.style.borderColor = '#E4A530'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#2E2317'; }}
                />
              ))}
              {pinError && <p style={{ color: '#E05757', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{pinError}</p>}
              {pinSuccess && <p style={{ color: '#6BCF7F', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{pinSuccess}</p>}
              <div className="flex gap-2 mt-1">
                <button
                  onClick={handlePinChange}
                  className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{ backgroundColor: '#E4A530', color: '#17110C', fontFamily: 'var(--font-mono)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#F0BC6A'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#E4A530'; }}
                >
                  Update PIN
                </button>
                <button
                  onClick={() => { setChangingPin(false); setPinError(''); }}
                  className="px-4 py-2 rounded-lg text-sm transition-colors"
                  style={{ backgroundColor: '#271E14', color: '#8A7D6B', fontFamily: 'var(--font-mono)', border: '1px solid #2E2317' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
