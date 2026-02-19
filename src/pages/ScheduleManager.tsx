import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PinGate, checkPinAuth } from '../components/PinGate';
import { ScheduleGrid } from '../components/ScheduleGrid';
import { StationSidebar } from '../components/StationSidebar';
import { NowPlaying } from '../components/NowPlaying';
import { SettingsPanel } from '../components/SettingsPanel';
import { useSchedule } from '../hooks/useSchedule';
import { useSettings } from '../hooks/useSettings';
import { getCurrentStation } from '../lib/schedule';

export function ScheduleManager() {
  const [authenticated, setAuthenticated] = useState(checkPinAuth());
  const [showSettings, setShowSettings] = useState(false);
  const { blocks, loading: schedLoading } = useSchedule();
  const { settings, loading: settingsLoading, updateSetting } = useSettings();

  if (!authenticated) {
    return (
      <PinGate
        correctPin={settings.pin}
        onAuthenticated={() => setAuthenticated(true)}
      />
    );
  }

  const currentStation = getCurrentStation(blocks, settings.default_station);

  return (
    <div className="min-h-screen bg-app-bg flex flex-col" style={{ height: '100dvh' }}>
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50 flex-shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-mono font-bold text-amber-400 tracking-wider">CULTURE WORKS</h1>
          <span className="hidden sm:block text-gray-600 text-xs font-mono">// music scheduler</span>
        </div>
        <div className="flex items-center gap-4">
          <NowPlaying station={currentStation} isPlaying={!settings.is_paused} compact />
          <Link
            to="/player"
            className="text-xs font-mono text-gray-400 hover:text-amber-400 transition-colors border border-gray-700 hover:border-amber-400/50 px-3 py-1.5 rounded-lg"
          >
            Player →
          </Link>
          <button
            onClick={() => setShowSettings(true)}
            className="text-gray-400 hover:text-amber-400 transition-colors text-lg"
            aria-label="Settings"
          >
            ⚙
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden gap-4 p-4">
        {/* Station sidebar */}
        <div className="hidden md:flex flex-col">
          <StationSidebar />
        </div>

        {/* Schedule grid */}
        <div className="flex-1 overflow-auto">
          {schedLoading || settingsLoading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500 font-mono text-sm animate-pulse">Loading schedule...</p>
            </div>
          ) : (
            <ScheduleGrid />
          )}
        </div>
      </div>

      {/* Mobile station drawer hint */}
      <div className="md:hidden border-t border-gray-700/50 px-4 py-2 flex-shrink-0">
        <p className="text-xs text-gray-500 font-mono text-center">Drag stations from above to schedule them</p>
      </div>

      {showSettings && (
        <SettingsPanel
          settings={settings}
          onUpdateSetting={updateSetting}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
