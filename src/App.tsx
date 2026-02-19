import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ScheduleManager } from './pages/ScheduleManager';
import { PlayerPage } from './pages/PlayerPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ScheduleManager />} />
        <Route path="/player" element={<PlayerPage />} />
      </Routes>
    </BrowserRouter>
  );
}
