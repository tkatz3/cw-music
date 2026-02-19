import { useState } from 'react';
import { STATIONS } from '../lib/stations';
import type { Settings } from '../hooks/useSettings';

interface SettingsPanelProps {
  settings: Settings;
  onUpdateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => Promise<void>;
  onClose: () => void;
}

export function SettingsPanel({ settings, onUpdateSetting, onClose }: SettingsPanelProps) {
  const [changingPin, setChangingPin] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinSuccess, setPinSuccess] = useState('');

  async function handlePinChange() {
    setPinError('');
    setPinSuccess('');
    if (currentPin !== settings.pin) {
      setPinError('Current PIN is incorrect.');
      return;
    }
    if (!/^\d{4}$/.test(newPin)) {
      setPinError('New PIN must be exactly 4 digits.');
      return;
    }
    if (newPin !== confirmPin) {
      setPinError('New PINs do not match.');
      return;
    }
    await onUpdateSetting('pin', newPin);
    setPinSuccess('PIN updated!');
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setChangingPin(false);
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-sm space-y-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-mono font-bold text-amber-400">Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors text-xl leading-none">&times;</button>
        </div>

        {/* Default Station */}
        <div className="space-y-2">
          <label className="text-xs text-gray-400 uppercase tracking-widest font-mono">Default Station</label>
          <select
            value={settings.default_station}
            onChange={(e) => onUpdateSetting('default_station', e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm font-mono focus:border-amber-400 focus:outline-none"
          >
            {STATIONS.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <p className="text-xs text-gray-500">Plays when no station is scheduled</p>
        </div>

        {/* Change PIN */}
        <div className="space-y-2">
          <label className="text-xs text-gray-400 uppercase tracking-widest font-mono">PIN</label>
          {!changingPin ? (
            <button
              onClick={() => setChangingPin(true)}
              className="text-sm text-amber-400 hover:text-amber-300 transition-colors font-mono"
            >
              Change PIN →
            </button>
          ) : (
            <div className="space-y-2">
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="Current PIN"
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm font-mono focus:border-amber-400 focus:outline-none"
              />
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="New PIN (4 digits)"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm font-mono focus:border-amber-400 focus:outline-none"
              />
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="Confirm new PIN"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm font-mono focus:border-amber-400 focus:outline-none"
              />
              {pinError && <p className="text-red-400 text-xs">{pinError}</p>}
              {pinSuccess && <p className="text-green-400 text-xs">{pinSuccess}</p>}
              <div className="flex gap-2">
                <button
                  onClick={handlePinChange}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-mono font-bold py-2 rounded-lg text-sm transition-colors"
                >
                  Update PIN
                </button>
                <button
                  onClick={() => { setChangingPin(false); setPinError(''); }}
                  className="px-4 bg-gray-700 hover:bg-gray-600 text-white font-mono py-2 rounded-lg text-sm transition-colors"
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
