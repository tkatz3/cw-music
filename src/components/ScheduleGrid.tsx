import { DndContext, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { useState } from 'react';
import { DAY_SHORT, START_HOUR, END_HOUR } from '../lib/schedule';
import { STATIONS } from '../lib/stations';
import { TimeSlot } from './TimeSlot';
import { useSchedule } from '../hooks/useSchedule';

function formatHour(hour: number) {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
}

export function ScheduleGrid() {
  const { assignStation, clearSlot, getSlotStation } = useSchedule();
  const [activeStationId, setActiveStationId] = useState<string | null>(null);
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  function handleDragStart(event: DragStartEvent) {
    const stationId = event.active.data.current?.stationId as string | undefined;
    setActiveStationId(stationId ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveStationId(null);
    const stationId = event.active.data.current?.stationId as string | undefined;
    const slotData = event.over?.data.current as { day: number; hour: number } | undefined;
    if (stationId && slotData) {
      assignStation(slotData.day, slotData.hour, stationId);
    }
  }

  const draggedStation = activeStationId ? STATIONS.find((s) => s.id === activeStationId) : null;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="overflow-auto flex-1">
        <div
          className="grid min-w-[600px]"
          style={{ gridTemplateColumns: '56px repeat(7, 1fr)' }}
        >
          {/* Header row */}
          <div className="sticky top-0 bg-app-bg z-10" />
          {DAY_SHORT.map((day) => (
            <div key={day} className="sticky top-0 bg-app-bg z-10 text-center text-xs font-mono text-gray-400 uppercase tracking-widest py-2 border-b border-gray-700/50">
              {day}
            </div>
          ))}

          {/* Time rows */}
          {hours.map((hour) => (
            <>
              <div
                key={`label-${hour}`}
                className="text-right pr-2 text-[10px] font-mono text-gray-500 flex items-center justify-end"
                style={{ height: '40px' }}
              >
                {formatHour(hour)}
              </div>
              {Array.from({ length: 7 }, (_, day) => (
                <div key={`slot-${day}-${hour}`} className="p-0.5">
                  <TimeSlot
                    day={day}
                    hour={hour}
                    stationId={getSlotStation(day, hour)}
                    onClear={() => clearSlot(day, hour)}
                  />
                </div>
              ))}
            </>
          ))}
        </div>
      </div>

      <DragOverlay>
        {draggedStation && (
          <div
            className="px-2 py-1 rounded text-xs font-mono font-bold shadow-xl border"
            style={{
              backgroundColor: `${draggedStation.color}33`,
              borderColor: draggedStation.color,
              color: draggedStation.color,
            }}
          >
            {draggedStation.name}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
