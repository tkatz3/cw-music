import { useEffect, useState } from 'react';
import { ref, onValue, push, remove } from 'firebase/database';
import { db } from '../lib/firebase';
import type { ScheduleBlock } from '../lib/schedule';
import type { Playlist } from '../lib/stations';

export function useSchedule() {
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const scheduleRef = ref(db, 'schedule_blocks');
    const unsubscribe = onValue(
      scheduleRef,
      (snapshot) => {
        const data = snapshot.val();
        const parsed: ScheduleBlock[] = data
          ? Object.entries(data).map(([id, block]) => ({ id, ...(block as Omit<ScheduleBlock, 'id'>) }))
          : [];
        setBlocks(parsed);
        setError(null);
        setLoading(false);
      },
      (err) => {
        console.error('Firebase schedule error:', err);
        setError(err.message);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Use a ref-based approach so assignStation always sees fresh blocks
  const blocksRef = { current: blocks };
  blocksRef.current = blocks;

  // Display hours >= 24 wrap to the next day (e.g. hour 25 = 1am next day)
  function resolveSlot(day: number, hour: number): { day: number; hour: number } {
    if (hour >= 24) return { day: (day + 1) % 7, hour: hour - 24 };
    return { day, hour };
  }

  async function assignStation(day: number, hour: number, stationId: string) {
    const { day: d, hour: h } = resolveSlot(day, hour);
    const existing = blocksRef.current.filter(
      (b) => b.day_of_week === d && b.start_hour === h && b.start_minute === 0
    );
    for (const block of existing) {
      await remove(ref(db, `schedule_blocks/${block.id}`));
    }
    await push(ref(db, 'schedule_blocks'), {
      day_of_week: d,
      start_hour: h,
      start_minute: 0,
      end_hour: h + 1,
      end_minute: 0,
      station_id: stationId,
    });
  }

  async function assignPlaylist(day: number, startHour: number, playlist: Playlist) {
    // Fill consecutive hours, one station per hour
    for (let i = 0; i < playlist.stationIds.length; i++) {
      const hour = startHour + i;
      if (hour >= 24) break;
      await assignStation(day, hour, playlist.stationIds[i]);
    }
  }

  async function clearSlot(day: number, hour: number) {
    const { day: d, hour: h } = resolveSlot(day, hour);
    const toRemove = blocksRef.current.filter(
      (b) => b.day_of_week === d && b.start_hour === h && b.start_minute === 0
    );
    for (const block of toRemove) {
      await remove(ref(db, `schedule_blocks/${block.id}`));
    }
  }

  async function clearDay(day: number) {
    const toRemove = blocksRef.current.filter((b) => b.day_of_week === day);
    for (const block of toRemove) {
      await remove(ref(db, `schedule_blocks/${block.id}`));
    }
  }

  function getSlotStation(day: number, hour: number): string | null {
    const { day: d, hour: h } = resolveSlot(day, hour);
    const block = blocksRef.current.find(
      (b) => b.day_of_week === d && b.start_hour === h && b.start_minute === 0
    );
    return block?.station_id ?? null;
  }

  return { blocks, loading, error, assignStation, assignPlaylist, clearSlot, clearDay, getSlotStation };
}
