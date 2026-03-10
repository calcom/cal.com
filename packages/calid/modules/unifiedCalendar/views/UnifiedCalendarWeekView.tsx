import { cn } from "@calid/features/lib/cn";
import { format, isToday } from "date-fns";

import type { CalendarEvent, CalendarSource } from "../lib/types";
import { UnifiedCalendarDayColumn, UnifiedCalendarTimeLabels } from "./UnifiedCalendarDayView";

interface UnifiedCalendarWeekViewProps {
  viewDays: Date[];
  filteredEvents: CalendarEvent[];
  calendarMap: Map<string, CalendarSource>;
  getConflicts: (event: CalendarEvent) => CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
  onQuickBookSlot: (slot: { date: Date; hour: number }) => void;
  onSelectDay: (day: Date) => void;
}

export const UnifiedCalendarWeekView = ({
  viewDays,
  filteredEvents,
  calendarMap,
  getConflicts,
  onSelectEvent,
  onQuickBookSlot,
  onSelectDay,
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
                calendarMap={calendarMap}
                getConflicts={getConflicts}
                onSelectEvent={onSelectEvent}
                onQuickBookSlot={onQuickBookSlot}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
