import { cn } from "@calid/features/lib/cn";
import { format, isSameMonth, isToday } from "date-fns";

import { PALETTE, MONTH_VIEW_DAY_LABELS } from "../lib/constants";
import type { UnifiedCalendarEventVM } from "../lib/types";
import { splitEventsForDay } from "../lib/utils";

interface UnifiedCalendarMonthViewProps {
  currentDate: Date;
  viewDays: Date[];
  filteredEvents: UnifiedCalendarEventVM[];
  onSelectDay: (day: Date) => void;
  onSelectEvent: (event: UnifiedCalendarEventVM) => void;
}

export const UnifiedCalendarMonthView = ({
  currentDate,
  viewDays,
  filteredEvents,
  onSelectDay,
  onSelectEvent,
}: UnifiedCalendarMonthViewProps) => {
  return (
    <div>
      <div className="border-border/30 grid grid-cols-7 border-b">
        {MONTH_VIEW_DAY_LABELS.map((dayLabel) => (
          <div
            key={dayLabel}
            className="text-muted-foreground/50 py-2.5 text-center text-[10px] font-light uppercase tracking-wider">
            {dayLabel}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {viewDays.map((day) => {
          const { allDayEvents, timedEvents } = splitEventsForDay(filteredEvents, day);
          const dayEvents = [...allDayEvents, ...timedEvents];
          const isCurrentMonth = isSameMonth(day, currentDate);

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "border-border/20 hover:bg-muted/15 min-h-[110px] cursor-pointer border-b border-r p-1.5 transition-colors",
                !isCurrentMonth && "bg-muted/[0.04]",
                isToday(day) && "bg-primary/[0.03]"
              )}
              onClick={() => onSelectDay(day)}>
              <p
                className={cn(
                  "mb-1 text-[11px] font-medium",
                  isToday(day) &&
                    "bg-foreground text-background flex h-5 w-5 items-center justify-center rounded-full text-[10px]",
                  !isCurrentMonth && "text-muted-foreground/30",
                  isCurrentMonth && !isToday(day) && "text-foreground/60"
                )}>
                {format(day, "d")}
              </p>

              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((event) => {
                  return (
                    <button
                      key={event.id}
                      type="button"
                      className={cn(
                        "bg-muted/30 text-foreground/60 hover:bg-muted/50 w-full truncate rounded border-l-2 px-1.5 py-0.5 text-left text-[10px] transition-colors",
                        event.status === "CANCELLED" && "text-muted-foreground/50 line-through",
                        event.status === "TENTATIVE" && "border-dashed"
                      )}
                      style={{ borderLeftColor: event.color || PALETTE.neutralGray }}
                      onClick={(mouseEvent) => {
                        mouseEvent.stopPropagation();
                        onSelectEvent(event);
                      }}>
                      {event.isAllDay ? event.title : `${format(event.start, "h:mm")} ${event.title}`}
                    </button>
                  );
                })}

                {dayEvents.length > 3 && (
                  <p className="text-muted-foreground/40 pl-1 text-[10px]">+{dayEvents.length - 3} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
