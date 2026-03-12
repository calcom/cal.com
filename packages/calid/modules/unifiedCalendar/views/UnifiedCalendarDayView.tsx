import { cn } from "@calid/features/lib/cn";
import { differenceInMinutes, format, isToday, setHours } from "date-fns";

import { UnifiedCalendarEventBlock } from "../components/UnifiedCalendarEventBlock";
import { HOURS } from "../lib/constants";
import type { UnifiedCalendarEventVM } from "../lib/types";
import { getCurrentTimeTop, splitEventsForDay } from "../lib/utils";

interface UnifiedCalendarDayColumnProps {
  day: Date;
  filteredEvents: UnifiedCalendarEventVM[];
  getConflicts: (event: UnifiedCalendarEventVM) => UnifiedCalendarEventVM[];
  onSelectEvent: (event: UnifiedCalendarEventVM) => void;
  onQuickBookSlot: (slot: { date: Date; hour: number }) => void;
}

export const UnifiedCalendarDayColumn = ({
  day,
  filteredEvents,
  getConflicts,
  onSelectEvent,
  onQuickBookSlot,
}: UnifiedCalendarDayColumnProps) => {
  const { timedEvents } = splitEventsForDay(filteredEvents, day);
  const sortedEvents = [...timedEvents].sort((a, b) => a.start.getTime() - b.start.getTime());
  const eventColumns: UnifiedCalendarEventVM[][] = [];

  sortedEvents.forEach((event) => {
    let placed = false;

    for (const column of eventColumns) {
      if (column[column.length - 1].end <= event.start) {
        column.push(event);
        placed = true;
        break;
      }
    }

    if (!placed) eventColumns.push([event]);
  });

  const eventColumnMap = new Map<string, { col: number; total: number }>();

  eventColumns.forEach((column, columnIndex) => {
    column.forEach((event) => eventColumnMap.set(event.id, { col: columnIndex, total: eventColumns.length }));
  });

  const currentTimeTop = getCurrentTimeTop();

  return (
    <div key={day.toISOString()} className="relative" style={{ minHeight: "1440px" }}>
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

      {isToday(day) && (
        <div
          className="pointer-events-none absolute left-0 right-0 z-20 flex items-center"
          style={{ top: `${currentTimeTop}%` }}>
          <div className="bg-destructive/70 -ml-1 h-2 w-2 rounded-full" />
          <div className="bg-destructive/50 h-px flex-1" />
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
    <div className="border-border/20 border-b">
      <div className="flex min-h-11 items-start gap-2 p-2">
        <span className="text-muted-foreground/60 mt-1 shrink-0 text-[10px] uppercase tracking-wide">
          All-day
        </span>
        <div className="flex flex-1 flex-wrap gap-1.5">
          {allDayEvents.length === 0 && (
            <span className="text-muted-foreground/35 mt-1 text-[11px]">No events</span>
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
}

export const UnifiedCalendarDayView = ({
  currentDate,
  filteredEvents,
  getConflicts,
  onSelectEvent,
  onQuickBookSlot,
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
          />
        </div>
      </div>
    </div>
  );
};
