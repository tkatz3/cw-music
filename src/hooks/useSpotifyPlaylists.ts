import { useEffect, useState } from 'react';
import { ref, onValue, set, remove } from 'firebase/database';
import { db } from '../lib/firebase';
import type { SpotifyPlaylistRecord } from '../lib/stations';

export function useSpotifyPlaylists() {
  const [playlists, setPlaylists] = useState<SpotifyPlaylistRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const playlistsRef = ref(db, 'spotify_playlists');
    const unsubscribe = onValue(
      playlistsRef,
      (snapshot) => {
        const data = snapshot.val();
        const parsed: SpotifyPlaylistRecord[] = data
          ? (Object.values(data) as SpotifyPlaylistRecord[])
          : [];
        setPlaylists(parsed);
        setLoading(false);
      },
      (err) => {
        console.error('Firebase Spotify playlists error:', err);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  async function addPlaylist(playlist: SpotifyPlaylistRecord) {
    await set(ref(db, `spotify_playlists/${playlist.id}`), playlist);
  }

  async function removePlaylist(id: string) {
    await remove(ref(db, `spotify_playlists/${id}`));
  }

  return { playlists, loading, addPlaylist, removePlaylist };
}
