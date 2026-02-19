import { STATIONS } from '../lib/stations';
import { StationCard } from './StationCard';

export function StationSidebar() {
  return (
    <aside className="w-56 flex-shrink-0 flex flex-col gap-2 overflow-y-auto pr-1">
      <p className="text-xs text-gray-500 uppercase tracking-widest mb-1 font-mono">Stations</p>
      {STATIONS.map((station) => (
        <StationCard key={station.id} station={station} />
      ))}
    </aside>
  );
}
