import { useEffect, useState } from 'react';
import { ref, onValue, set, remove } from 'firebase/database';
import { db } from '../lib/firebase';
import type { Playlist } from '../lib/stations';
import { stationColor } from '../lib/stations';

export function usePlaylists() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const playlistsRef = ref(db, 'playlists');
    const unsubscribe = onValue(
      playlistsRef,
      (snapshot) => {
        const data = snapshot.val();
        const parsed: Playlist[] = data ? (Object.values(data) as Playlist[]) : [];
        setPlaylists(parsed);
        setLoading(false);
      },
      (err) => {
        console.error('Firebase playlists error:', err);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  async function createPlaylist(name: string, stationIds: string[]): Promise<Playlist> {
    const id = crypto.randomUUID();
    const playlist: Playlist = { id, name, stationIds, color: stationColor(id) };
    await set(ref(db, `playlists/${id}`), playlist);
    return playlist;
  }

  async function updatePlaylist(id: string, updates: Partial<Omit<Playlist, 'id'>>) {
    for (const [key, value] of Object.entries(updates)) {
      await set(ref(db, `playlists/${id}/${key}`), value);
    }
  }

  async function deletePlaylist(id: string) {
    await remove(ref(db, `playlists/${id}`));
  }

  return { playlists, loading, createPlaylist, updatePlaylist, deletePlaylist };
}
