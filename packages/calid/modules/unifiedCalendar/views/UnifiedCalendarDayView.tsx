import { cn } from "@calid/features/lib/cn";
import { differenceInMinutes, format, isSameDay, setHours, startOfDay } from "date-fns";
import type { PointerEvent as ReactPointerEvent } from "react";

import { UnifiedCalendarEventBlock } from "../components/UnifiedCalendarEventBlock";
import { HOURS } from "../lib/constants";
import type { UnifiedCalendarEventVM } from "../lib/types";
import { splitEventsForDay } from "../lib/utils";

interface UnifiedCalendarDayColumnProps {
  day: Date;
  filteredEvents: UnifiedCalendarEventVM[];
  getConflicts: (event: UnifiedCalendarEventVM) => UnifiedCalendarEventVM[];
  onSelectEvent: (event: UnifiedCalendarEventVM) => void;
  onQuickBookSlot: (slot: { date: Date; hour: number }) => void;
  draggingEvent: UnifiedCalendarEventVM | null;
  pendingRescheduleEventIds: Set<string>;
  dragPreview: {
    start: Date;
    end: Date;
    dropSurface: "time-grid" | "month-grid";
  } | null;
  onStartDragEvent: (event: UnifiedCalendarEventVM, pointer: { x: number; y: number }) => void;
}

export const UnifiedCalendarDayColumn = ({
  day,
  filteredEvents,
  getConflicts,
  onSelectEvent,
  onQuickBookSlot,
  draggingEvent,
  pendingRescheduleEventIds,
  dragPreview,
  onStartDragEvent,
}: UnifiedCalendarDayColumnProps) => {
  const { timedEvents } = splitEventsForDay(filteredEvents, day);
  const sortedEvents = [...timedEvents].sort((a, b) => a.start.getTime() - b.start.getTime());
  const eventColumns: UnifiedCalendarEventVM[][] = [];

  sortedEvents.forEach((event) => {
    let placed = false;

    for (const column of eventColumns) {
      const lastEvent = column[column.length - 1];
      if (lastEvent.end <= event.start) {
        column.push(event);
        placed = true;
        break;
      }
    }

    if (!placed) eventColumns.push([event]);
  });

  const eventColumnMap = new Map<string, { col: number; total: number }>();

  // For each event, compute the number of columns that overlap with it (its local conflict group),
  // rather than using the global column count. This ensures non-overlapping events
  // take the full width of their slot instead of being squeezed into a fraction.
  eventColumns.forEach((column, columnIndex) => {
    column.forEach((event) => {
      const localTotal = eventColumns.filter((otherCol) =>
        otherCol.some((otherEvent) => otherEvent.start < event.end && otherEvent.end > event.start)
      ).length;
      eventColumnMap.set(event.id, { col: columnIndex, total: localTotal });
    });
  });

  return (
    <div
      key={day.toISOString()}
      className={cn("relative", draggingEvent && "select-none")}
      style={{ minHeight: "1440px" }}
      data-unified-time-column="true"
      data-unified-day-start={startOfDay(day).toISOString()}>
      {HOURS.map((hour) => (
        <div
          key={hour}
          className="border-border/20 hover:bg-muted/20 absolute left-0 right-0 cursor-pointer border-t transition-colors"
          style={{ top: `${(hour / 24) * 100}%`, height: `${100 / 24}%` }}
          onClick={() => onQuickBookSlot({ date: day, hour })}
        />
      ))}

      {HOURS.map((hour) => (
        <div
          key={`half-${hour}`}
          className="border-border/[0.08] absolute left-0 right-0 border-t"
          style={{ top: `${((hour + 0.5) / 24) * 100}%` }}
        />
      ))}

      {dragPreview?.dropSurface === "time-grid" && isSameDay(dragPreview.start, day) && (
        <div
          className="pointer-events-none absolute left-1 right-1 z-30 rounded-md border border-dashed border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.12)]"
          style={{
            top: `${((dragPreview.start.getHours() * 60 + dragPreview.start.getMinutes()) / 1440) * 100}%`,
            height: `${Math.max(
              (differenceInMinutes(dragPreview.end, dragPreview.start) / 1440) * 100,
              (20 / 1440) * 100
            )}%`,
          }}>
          <p className="text-primary px-1 py-0.5 text-[10px] font-medium">
            {format(dragPreview.start, "h:mm")} - {format(dragPreview.end, "h:mm a")}
          </p>
        </div>
      )}

      {timedEvents.map((event) => {
        const startMinutes = event.start.getHours() * 60 + event.start.getMinutes();
        const durationMinutes = differenceInMinutes(event.end, event.start);
        const topPercent = (startMinutes / 1440) * 100;
        const heightPercent = Math.max((durationMinutes / 1440) * 100, (20 / 1440) * 100);
        const columnInfo = eventColumnMap.get(event.id) || { col: 0, total: 1 };
        const widthPercent = 100 / columnInfo.total;
        const leftPercent = columnInfo.col * widthPercent;

        return (
          <UnifiedCalendarEventBlock
            key={event.id}
            event={event}
            isConflict={getConflicts(event).length > 0}
            onClick={() => onSelectEvent(event)}
            isDragEnabled={
              event.canReschedule &&
              Boolean(event.internal?.bookingId) &&
              !event.isAllDay &&
              !pendingRescheduleEventIds.has(event.id)
            }
            isDragging={draggingEvent?.id === event.id}
            isRescheduling={pendingRescheduleEventIds.has(event.id)}
            onPointerDown={(pointerEvent: ReactPointerEvent<HTMLButtonElement>) => {
              if (pointerEvent.button !== 0) return;
              onStartDragEvent(event, { x: pointerEvent.clientX, y: pointerEvent.clientY });
            }}
            style={{
              top: `${topPercent}%`,
              height: `${heightPercent}%`,
              left: `calc(${leftPercent}% + 4px)`,
              width: `calc(${widthPercent}% - 8px)`,
              minHeight: "28px",
            }}
          />
        );
      })}
    </div>
  );
};

interface UnifiedCalendarAllDayRowProps {
  day: Date;
  filteredEvents: UnifiedCalendarEventVM[];
  onSelectEvent: (event: UnifiedCalendarEventVM) => void;
}

export const UnifiedCalendarAllDayRow = ({
  day,
  filteredEvents,
  onSelectEvent,
}: UnifiedCalendarAllDayRowProps) => {
  const { allDayEvents } = splitEventsForDay(filteredEvents, day);

  return (
    <div className="bg-default sticky top-0 z-20 border-b">
      <div className="flex h-full  items-start">
        <div className="flex w-12 shrink-0 items-center justify-center border-r px-4 py-2 text-[10px] uppercase tracking-wide">
          Full Day
        </div>
        <div className="flex flex-1 flex-wrap gap-1.5 p-1.5">
          {allDayEvents.length === 0 && (
            <span className="text-muted-foreground/35 mt-1 text-[11px]">{"\u200B"}</span>
          )}
          {allDayEvents.map((event) => (
            <button
              key={event.id}
              type="button"
              className={cn(
                "min-w-0 rounded border-l-2 px-2 py-1 text-left text-[11px]",
                "bg-muted/35 text-foreground/70 hover:bg-muted/50 transition-colors",
                event.status === "CANCELLED" && "text-muted-foreground/50 line-through",
                event.status === "TENTATIVE" && "border-dashed"
              )}
              style={{ borderLeftColor: event.color }}
              onClick={() => onSelectEvent(event)}>
              <span className="truncate">{event.title}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export const UnifiedCalendarTimeLabels = () => {
  return (
    <div className="relative w-12 shrink-0" style={{ minHeight: "1440px" }}>
      {HOURS.map((hour) => (
        <div
          key={hour}
          className="text-muted-foreground/50 absolute left-0 right-0 -translate-y-1/2 pr-2 text-right text-[10px] font-light"
          style={{ top: `${(hour / 24) * 100}%` }}>
          {hour === 0 ? "" : format(setHours(new Date(), hour), "ha").toLowerCase()}
        </div>
      ))}
    </div>
  );
};

interface UnifiedCalendarDayViewProps {
  currentDate: Date;
  filteredEvents: UnifiedCalendarEventVM[];
  getConflicts: (event: UnifiedCalendarEventVM) => UnifiedCalendarEventVM[];
  onSelectEvent: (event: UnifiedCalendarEventVM) => void;
  onQuickBookSlot: (slot: { date: Date; hour: number }) => void;
  draggingEvent: UnifiedCalendarEventVM | null;
  pendingRescheduleEventIds: Set<string>;
  dragPreview: {
    start: Date;
    end: Date;
    dropSurface: "time-grid" | "month-grid";
  } | null;
  onStartDragEvent: (event: UnifiedCalendarEventVM, pointer: { x: number; y: number }) => void;
}

export const UnifiedCalendarDayView = ({
  currentDate,
  filteredEvents,
  getConflicts,
  onSelectEvent,
  onQuickBookSlot,
  draggingEvent,
  pendingRescheduleEventIds,
  dragPreview,
  onStartDragEvent,
}: UnifiedCalendarDayViewProps) => {
  return (
    <div>
      <UnifiedCalendarAllDayRow
        day={currentDate}
        filteredEvents={filteredEvents}
        onSelectEvent={onSelectEvent}
      />
      <div className="flex">
        <UnifiedCalendarTimeLabels />
        <div className={cn("border-border/20 flex-1 border-l")}>
          <UnifiedCalendarDayColumn
            day={currentDate}
            filteredEvents={filteredEvents}
            getConflicts={getConflicts}
            onSelectEvent={onSelectEvent}
            onQuickBookSlot={onQuickBookSlot}
            draggingEvent={draggingEvent}
            pendingRescheduleEventIds={pendingRescheduleEventIds}
            dragPreview={dragPreview}
            onStartDragEvent={onStartDragEvent}
          />
        </div>
      </div>
    </div>
  );
};
