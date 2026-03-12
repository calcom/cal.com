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
  onStartDragEvent: (event: UnifiedCalendarEventVM) => void;
  onEndDragEvent: () => void;
  onDropReschedule: (payload: { event: UnifiedCalendarEventVM; start: Date; end: Date }) => void;
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
  onStartDragEvent,
  onEndDragEvent,
  onDropReschedule,
}: UnifiedCalendarWeekViewProps) => {
  return (
    <div>
      <div className="border-border/30 bg-background sticky top-0 z-10 flex border-b">
        <div className="w-12 shrink-0" />

        {viewDays.map((day) => (
          <div
            key={day.toISOString()}
            className={cn(
              "border-border/20 hover:bg-muted/20 flex-1 cursor-pointer border-l py-2.5 text-center transition-colors",
              isToday(day) && "bg-primary/[0.03]"
            )}
            onClick={() => onSelectDay(day)}>
            <p className="text-muted-foreground/50 text-[10px] font-light uppercase tracking-wider">
              {format(day, "EEE")}
            </p>
            <p
              className={cn(
                "mt-1 text-xs font-medium",
                isToday(day) &&
                  "bg-foreground text-background mx-auto flex h-6 w-6 items-center justify-center rounded-full",
                !isToday(day) && "text-foreground/70"
              )}>
              {format(day, "d")}
            </p>
          </div>
        ))}
      </div>

      <div className="border-border/20 bg-background sticky top-[46px] z-10 flex border-b">
        <div className="text-muted-foreground/55 flex w-12 shrink-0 items-center justify-center text-[10px] uppercase tracking-wide">
          All-day
        </div>
        <div className="flex flex-1">
          {viewDays.map((day) => {
            const { allDayEvents } = splitEventsForDay(filteredEvents, day);

            return (
              <div
                key={`all-day-${day.toISOString()}`}
                className="border-border/20 min-h-12 flex-1 border-l p-1.5">
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

      <div className="flex">
        <UnifiedCalendarTimeLabels />

        <div className="flex flex-1">
          {viewDays.map((day) => (
            <div
              key={day.toISOString()}
              className={cn("border-border/20 flex-1 border-l", isToday(day) && "bg-primary/[0.015]")}>
              <UnifiedCalendarDayColumn
                day={day}
                filteredEvents={filteredEvents}
                getConflicts={getConflicts}
                onSelectEvent={onSelectEvent}
                onQuickBookSlot={onQuickBookSlot}
                draggingEvent={draggingEvent}
                pendingRescheduleEventIds={pendingRescheduleEventIds}
                onStartDragEvent={onStartDragEvent}
                onEndDragEvent={onEndDragEvent}
                onDropReschedule={onDropReschedule}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
