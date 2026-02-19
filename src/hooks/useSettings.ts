import { useEffect, useState } from 'react';
import { ref, onValue, set } from 'firebase/database';
import { db } from '../lib/firebase';

export interface Settings {
  default_station: string;
  volume: number;
  is_paused: boolean;
  pin: string;
}

const DEFAULT_SETTINGS: Settings = {
  default_station: 'groovesalad',
  volume: 70,
  is_paused: false,
  pin: '1315',
};

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const settingsRef = ref(db, 'settings');
    const unsubscribe = onValue(settingsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setSettings({ ...DEFAULT_SETTINGS, ...data });
      } else {
        // Seed defaults if nothing exists
        set(settingsRef, DEFAULT_SETTINGS);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  async function updateSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
    await set(ref(db, `settings/${key}`), value);
  }

  return { settings, loading, updateSetting };
}
