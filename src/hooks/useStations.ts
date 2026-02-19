import { useEffect, useState } from 'react';
import { ref, onValue, set, remove } from 'firebase/database';
import { db } from '../lib/firebase';
import type { Station } from '../lib/stations';
import { stationColor } from '../lib/stations';

export interface RadioBrowserStation {
  stationuuid: string;
  name: string;
  url_resolved: string;
  tags: string;
  country: string;
  bitrate: number;
}

export function useStations() {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stationsRef = ref(db, 'stations');
    const unsubscribe = onValue(
      stationsRef,
      (snapshot) => {
        const data = snapshot.val();
        const parsed: Station[] = data ? (Object.values(data) as Station[]) : [];
        setStations(parsed);
        setLoading(false);
      },
      (err) => {
        console.error('Firebase stations error:', err);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  async function addStation(rb: RadioBrowserStation) {
    const station: Station = {
      id: rb.stationuuid,
      name: rb.name.trim(),
      description: rb.tags || rb.country || '',
      stream_url: rb.url_resolved,
      color: stationColor(rb.stationuuid),
    };
    await set(ref(db, `stations/${rb.stationuuid}`), station);
  }

  async function removeStation(id: string) {
    await remove(ref(db, `stations/${id}`));
  }

  return { stations, loading, addStation, removeStation };
}
