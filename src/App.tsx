import { useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { authReady } from './lib/firebase';
import { ScheduleManager } from './pages/ScheduleManager';
import { PlayerPage } from './pages/PlayerPage';

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    authReady.then(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen bg-app-bg flex items-center justify-center">
        <p className="text-gray-600 font-mono text-sm animate-pulse">Connecting...</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ScheduleManager />} />
        <Route path="/player" element={<PlayerPage />} />
      </Routes>
    </BrowserRouter>
  );
}
