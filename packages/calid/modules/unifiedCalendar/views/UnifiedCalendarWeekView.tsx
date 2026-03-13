import { cn } from "@calid/features/lib/cn";
import { format, isToday } from "date-fns";

import type { UnifiedCalendarEventVM } from "../lib/types";
import { splitEventsForDay } from "../lib/utils";
import { UnifiedCalendarDayColumn, UnifiedCalendarTimeLabels } from "./UnifiedCalendarDayView";

interface UnifiedCalendarWeekViewProps {
  viewDays: Date[];
  filteredEvents: UnifiedCalendarEventVM[];
  getConflicts: (event: UnifiedCalendarEventVM) => UnifiedCalendarEventVM[];
  onSelectEvent: (event: UnifiedCalendarEventVM) => void;
  onQuickBookSlot: (slot: { date: Date; hour: number }) => void;
  onSelectDay: (day: Date) => void;
  draggingEvent: UnifiedCalendarEventVM | null;
  pendingRescheduleEventIds: Set<string>;
  dragPreview: {
    start: Date;
    end: Date;
    dropSurface: "time-grid" | "month-grid";
  } | null;
  onStartDragEvent: (event: UnifiedCalendarEventVM, pointer: { x: number; y: number }) => void;
}

export const UnifiedCalendarWeekView = ({
  viewDays,
  filteredEvents,
  getConflicts,
  onSelectEvent,
  onQuickBookSlot,
  onSelectDay,
  draggingEvent,
  pendingRescheduleEventIds,
  dragPreview,
  onStartDragEvent,
}: UnifiedCalendarWeekViewProps) => {
  return (
    <div>
      <div className="border-border/30 bg-default sticky top-0 z-20">
        <div className="border-border/30 flex border-b">
          <div className="w-12 shrink-0" />
          {viewDays.map((day) => (
            <div
              key={day.toISOString()}
              className="border-border/20 hover:bg-muted/20 flex-1 cursor-pointer border-l py-2.5 text-center transition-colors"
              onClick={() => onSelectDay(day)}>
              <p
                className={cn(
                  "text-muted-foreground/50 text-[10px] font-light uppercase tracking-wider",
                  isToday(day) && "text-brand-default"
                )}>
                {format(day, "EEE")}
              </p>
              <div className="mt-1 flex items-center justify-center">
                <div
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium",
                    isToday(day) && "bg-brand-default text-white"
                  )}>
                  {format(day, "d")}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="border-border/20 flex border-b">
          <div className="text-muted-foreground/55 flex w-12 shrink-0 items-center justify-center px-2 text-[10px] uppercase tracking-wide">
            Full Day
          </div>
          <div className="flex flex-1">
            {viewDays.map((day) => {
              const { allDayEvents } = splitEventsForDay(filteredEvents, day);
              return (
                <div
                  key={`all-day-${day.toISOString()}`}
                  className="border-border/20 bg-default min-h-12 flex-1 border-l p-1.5">
                  <div className="space-y-1">
                    {allDayEvents.slice(0, 2).map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        className={cn(
                          "bg-muted/30 text-foreground/65 hover:bg-muted/50 w-full truncate rounded border-l-2 px-1.5 py-0.5 text-left text-[10px] transition-colors",
                          event.status === "CANCELLED" && "text-muted-foreground/50 line-through",
                          event.status === "TENTATIVE" && "border-dashed"
                        )}
                        style={{ borderLeftColor: event.color }}
                        onClick={() => onSelectEvent(event)}>
                        {event.title}
                      </button>
                    ))}
                    {allDayEvents.length > 2 && (
                      <p className="text-muted-foreground/40 pl-0.5 text-[10px]">
                        +{allDayEvents.length - 2} more
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex">
        <UnifiedCalendarTimeLabels />

        <div className="flex flex-1">
          {viewDays.map((day) => (
            <div key={day.toISOString()} className={cn("border-border/20 flex-1 border-l")}>
              <UnifiedCalendarDayColumn
                day={day}
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
          ))}
        </div>
      </div>
    </div>
  );
};
