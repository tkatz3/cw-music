import { STATIONS } from './stations';
import type { Station } from './stations';

export interface ScheduleBlock {
  id: string;
  day_of_week: number; // 0 = Monday, 6 = Sunday
  start_hour: number;
  start_minute: number;
  end_hour: number;
  end_minute: number;
  station_id: string;
}

export function getCurrentStation(
  scheduleBlocks: ScheduleBlock[],
  defaultStationId: string
): Station {
  const now = new Date();
  const dayOfWeek = (now.getDay() + 6) % 7; // Convert JS Sunday=0 to Monday=0
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  const currentBlock = scheduleBlocks.find(
    (block) =>
      block.day_of_week === dayOfWeek &&
      (block.start_hour < currentHour ||
        (block.start_hour === currentHour && block.start_minute <= currentMinute)) &&
      (block.end_hour > currentHour ||
        (block.end_hour === currentHour && block.end_minute > currentMinute))
  );

  if (currentBlock) {
    return STATIONS.find((s) => s.id === currentBlock.station_id) || STATIONS[0];
  }
  return STATIONS.find((s) => s.id === defaultStationId) || STATIONS[0];
}

export function getNextStation(
  scheduleBlocks: ScheduleBlock[],
  _defaultStationId: string
): { station: Station; label: string } | null {
  const now = new Date();
  const dayOfWeek = (now.getDay() + 6) % 7;
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  // Find blocks later today or in the coming week
  const upcoming = scheduleBlocks
    .filter((block) => {
      if (block.day_of_week === dayOfWeek) {
        return (
          block.start_hour > currentHour ||
          (block.start_hour === currentHour && block.start_minute > currentMinute)
        );
      }
      return block.day_of_week > dayOfWeek;
    })
    .sort((a, b) => {
      const dayDiff = a.day_of_week - b.day_of_week;
      if (dayDiff !== 0) return dayDiff;
      if (a.start_hour !== b.start_hour) return a.start_hour - b.start_hour;
      return a.start_minute - b.start_minute;
    });

  if (upcoming.length === 0) return null;

  const next = upcoming[0];
  const station = STATIONS.find((s) => s.id === next.station_id);
  if (!station) return null;

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const time = `${next.start_hour % 12 || 12}:${String(next.start_minute).padStart(2, '0')} ${next.start_hour >= 12 ? 'PM' : 'AM'}`;
  const label =
    next.day_of_week === dayOfWeek ? `at ${time}` : `${days[next.day_of_week]} at ${time}`;

  return { station, label };
}

export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const START_HOUR = 6;
export const END_HOUR = 22; // exclusive — grid shows 6 AM through 9 PM (last slot starts at 21)
