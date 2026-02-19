import { useEffect, useRef, useState } from 'react';
import { DAY_SHORT, START_HOUR, END_HOUR, LATE_END_HOUR } from '../lib/schedule';
import type { Station } from '../lib/stations';
import { TimeSlot } from './TimeSlot';
import { useSchedule } from '../hooks/useSchedule';

interface ScheduleGridProps {
  stations: Station[];
}

function formatHour(hour: number) {
  const h = hour >= 24 ? hour - 24 : hour;
  if (h === 0) return '12am';
  if (h === 12) return '12pm';
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}

function getTodayIndex(): number {
  return (new Date().getDay() + 6) % 7;
}

// --- Resize drag state ---
interface ResizeDrag {
  day: number;
  stationId: string;
  runStart: number;   // first display-hour of the run
  runEnd: number;     // last display-hour of the run (at drag start)
  previewEnd: number; // where we're currently previewing to
}

export function ScheduleGrid({ stations }: ScheduleGridProps) {
  const { assignStation, clearSlot, getSlotStation } = useSchedule();
  const [showLate, setShowLate] = useState(false);
  const [resizeDrag, setResizeDrag] = useState<ResizeDrag | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const todayIndex = getTodayIndex();
  const hours = Array.from(
    { length: (showLate ? LATE_END_HOUR : END_HOUR) - START_HOUR },
    (_, i) => START_HOUR + i
  );

  // Find the start and end display-hours of the run containing (day, hour)
  function getRunBounds(day: number, hour: number): { start: number; end: number } | null {
    const stationId = getSlotStation(day, hour);
    if (!stationId) return null;

    let start = hour;
    while (start > START_HOUR && getSlotStation(day, start - 1) === stationId) start--;

    let end = hour;
    const maxHour = LATE_END_HOUR - 1;
    while (end < maxHour && getSlotStation(day, end + 1) === stationId) end++;

    return { start, end };
  }

  // Pointer-move handler: find which hour is under the cursor using data attributes
  useEffect(() => {
    if (!resizeDrag) return;

    function onPointerMove(e: PointerEvent) {
      if (!resizeDrag) return;
      // Find the slot element under the cursor
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const slotEl = el?.closest('[data-slot-hour]');
      if (!slotEl) return;

      const slotDay = parseInt(slotEl.getAttribute('data-slot-day') ?? '-1');
      const slotHour = parseInt(slotEl.getAttribute('data-slot-hour') ?? '-1');

      // Only extend within the same day column, at or beyond the run start
      if (slotDay !== resizeDrag.day || slotHour < resizeDrag.runStart) return;

      setResizeDrag((prev) => prev ? { ...prev, previewEnd: slotHour } : null);
    }

    async function onPointerUp() {
      if (!resizeDrag) return;
      const { day, stationId, runStart, runEnd, previewEnd } = resizeDrag;
      setResizeDrag(null);

      if (previewEnd === runEnd) return; // no change

      if (previewEnd > runEnd) {
        // Extending — fill new hours
        for (let h = runEnd + 1; h <= previewEnd; h++) {
          await assignStation(day, h, stationId);
        }
      } else {
        // Shrinking — clear removed hours (keep at least the run start)
        const newEnd = Math.max(previewEnd, runStart);
        for (let h = newEnd + 1; h <= runEnd; h++) {
          await clearSlot(day, h);
        }
      }
    }

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [resizeDrag]);

  function handleResizeStart(e: React.PointerEvent, day: number, hour: number) {
    e.stopPropagation();
    e.preventDefault();
    const stationId = getSlotStation(day, hour);
    if (!stationId) return;
    const bounds = getRunBounds(day, hour);
    if (!bounds) return;
    setResizeDrag({
      day,
      stationId,
      runStart: bounds.start,
      runEnd: bounds.end,
      previewEnd: bounds.end,
    });
  }

  // Determine if a slot should show a resize handle (last in its run, within visible hours)
  function isRunEnd(day: number, hour: number): boolean {
    const stationId = getSlotStation(day, hour);
    if (!stationId) return false;
    const nextHour = hour + 1;
    if (nextHour > (showLate ? LATE_END_HOUR - 1 : END_HOUR - 1)) return true;
    return getSlotStation(day, nextHour) !== stationId;
  }

  // Preview status for a given cell during resize
  function getPreviewStatus(day: number, hour: number): 'adding' | 'removing' | null {
    if (!resizeDrag || day !== resizeDrag.day) return null;
    const { runEnd, previewEnd } = resizeDrag;

    if (previewEnd > runEnd) {
      // Extending: hours from runEnd+1 to previewEnd are being "added"
      if (hour > runEnd && hour <= previewEnd) return 'adding';
    } else if (previewEnd < runEnd) {
      // Shrinking: hours from previewEnd+1 to runEnd are being "removed"
      if (hour > previewEnd && hour <= runEnd) return 'removing';
    }
    return null;
  }

  // Is this the last hour of the visual run end during preview (for showing handle)
  function isPreviewRunEnd(day: number, hour: number): boolean {
    if (resizeDrag && day === resizeDrag.day) {
      return hour === resizeDrag.previewEnd;
    }
    return isRunEnd(day, hour);
  }

  return (
    <div className="h-full flex flex-col overflow-hidden" ref={gridRef}>
      <div className="overflow-auto flex-1">
        <div
          className="grid min-w-[560px]"
          style={{ gridTemplateColumns: '44px repeat(7, 1fr)' }}
        >
          {/* Header */}
          <div className="sticky top-0 z-10" style={{ backgroundColor: '#17110C', borderBottom: '1px solid #2E2317' }} />
          {DAY_SHORT.map((day, i) => (
            <div
              key={day}
              className="sticky top-0 z-10 text-center py-2"
              style={{ backgroundColor: '#17110C', borderBottom: '1px solid #2E2317' }}
            >
              <span
                className="text-[10px] uppercase tracking-widest"
                style={{
                  fontFamily: 'var(--font-mono)',
                  color: i === todayIndex ? '#E4A530' : '#534840',
                  fontWeight: i === todayIndex ? '500' : '400',
                }}
              >
                {day}
              </span>
              {i === todayIndex && (
                <div className="w-1 h-1 rounded-full mx-auto mt-0.5" style={{ backgroundColor: '#E4A530' }} />
              )}
            </div>
          ))}

          {/* Time rows */}
          {hours.map((hour) => {
            const isMidnight = hour === 24;
            return (
              <>
                {/* Midnight divider */}
                {isMidnight && (
                  <>
                    <div
                      key="midnight-label"
                      className="col-span-8 flex items-center gap-2 px-3 py-1"
                      style={{ borderTop: '1px dashed #2E2317', marginTop: '2px' }}
                    >
                      <span style={{ color: '#3A2F20', fontSize: '9px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        past midnight ↓ next day
                      </span>
                    </div>
                  </>
                )}

                <div
                  key={`label-${hour}`}
                  className="flex items-center justify-end pr-2"
                  style={{ height: '38px' }}
                >
                  <span style={{ color: '#3A2F20', fontFamily: 'var(--font-mono)', fontSize: '9px' }}>
                    {formatHour(hour)}
                  </span>
                </div>
                {Array.from({ length: 7 }, (_, day) => {
                  const previewStatus = getPreviewStatus(day, hour);
                  const showHandle = isPreviewRunEnd(day, hour) || (resizeDrag?.day === day && hour === resizeDrag.previewEnd);
                  return (
                    <div key={`slot-${day}-${hour}`} className="p-[2px]">
                      <TimeSlot
                        day={day}
                        hour={hour}
                        stationId={getSlotStation(day, hour)}
                        stations={stations}
                        previewStatus={previewStatus}
                        showResizeHandle={showHandle && !!getSlotStation(day, hour)}
                        onClear={() => !resizeDrag && clearSlot(day, hour)}
                        onResizeStart={(e) => handleResizeStart(e, day, hour)}
                      />
                    </div>
                  );
                })}
              </>
            );
          })}
        </div>
      </div>

      {/* Late hours toggle */}
      <div
        className="flex-shrink-0 flex items-center justify-center py-2"
        style={{ borderTop: '1px solid #2E2317' }}
      >
        <button
          onClick={() => setShowLate((v) => !v)}
          className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] transition-colors"
          style={{
            color: showLate ? '#E4A530' : '#3A2F20',
            fontFamily: 'var(--font-mono)',
            border: `1px solid ${showLate ? '#7A5A18' : '#2E2317'}`,
            backgroundColor: showLate ? '#E4A53010' : 'transparent',
          }}
          onMouseEnter={(e) => { if (!showLate) (e.currentTarget as HTMLElement).style.color = '#8A7D6B'; }}
          onMouseLeave={(e) => { if (!showLate) (e.currentTarget as HTMLElement).style.color = '#3A2F20'; }}
        >
          {showLate ? '▲ hide late hours' : '▼ show late hours (10pm – 2am)'}
        </button>
      </div>
    </div>
  );
}
