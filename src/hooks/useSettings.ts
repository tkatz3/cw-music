import { useEffect, useState } from 'react';
import { ref, onValue, set } from 'firebase/database';
import { db } from '../lib/firebase';

export interface Settings {
  default_station: string;
  default_type: 'somafm' | 'spotify';
  volume: number;
  is_paused: boolean;
  pin: string;
  follow_schedule: boolean;
  // When follow_schedule is OFF, this station plays instead of whatever the schedule says.
  // null = no override (falls through to schedule / default station).
  manual_station_override: string | null;
  spotify_refresh_token: string | null;
  spotify_connected: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  default_station: '',
  default_type: 'somafm',
  volume: 70,
  is_paused: false,
  pin: '1315',
  follow_schedule: false,
  manual_station_override: null,
  spotify_refresh_token: null,
  spotify_connected: false,
};

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const settingsRef = ref(db, 'settings');
    const unsubscribe = onValue(
      settingsRef,
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setSettings({ ...DEFAULT_SETTINGS, ...data });
        } else {
          set(settingsRef, DEFAULT_SETTINGS);
        }
        setError(null);
        setLoading(false);
      },
      (err) => {
        console.error('Firebase settings error:', err);
        setError(err.message);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  async function updateSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
    await set(ref(db, `settings/${key}`), value);
  }

  return { settings, loading, error, updateSetting };
}
