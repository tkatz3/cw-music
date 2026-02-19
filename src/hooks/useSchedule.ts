import { useEffect, useState } from 'react';
import { ref, onValue, push, remove } from 'firebase/database';
import { db } from '../lib/firebase';
import type { ScheduleBlock } from '../lib/schedule';

export function useSchedule() {
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const scheduleRef = ref(db, 'schedule_blocks');
    const unsubscribe = onValue(scheduleRef, (snapshot) => {
      const data = snapshot.val();
      const parsed: ScheduleBlock[] = data
        ? Object.entries(data).map(([id, block]) => ({ id, ...(block as Omit<ScheduleBlock, 'id'>) }))
        : [];
      setBlocks(parsed);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  async function assignStation(day: number, hour: number, stationId: string) {
    // Remove any existing block for this exact hour slot first
    const existing = blocks.filter(
      (b) => b.day_of_week === day && b.start_hour === hour && b.start_minute === 0
    );
    for (const block of existing) {
      await remove(ref(db, `schedule_blocks/${block.id}`));
    }
    await push(ref(db, 'schedule_blocks'), {
      day_of_week: day,
      start_hour: hour,
      start_minute: 0,
      end_hour: hour + 1,
      end_minute: 0,
      station_id: stationId,
    });
  }

  async function clearSlot(day: number, hour: number) {
    const toRemove = blocks.filter(
      (b) => b.day_of_week === day && b.start_hour === hour && b.start_minute === 0
    );
    for (const block of toRemove) {
      await remove(ref(db, `schedule_blocks/${block.id}`));
    }
  }

  function getSlotStation(day: number, hour: number): string | null {
    const block = blocks.find(
      (b) => b.day_of_week === day && b.start_hour === hour && b.start_minute === 0
    );
    return block?.station_id ?? null;
  }

  return { blocks, loading, assignStation, clearSlot, getSlotStation };
}
