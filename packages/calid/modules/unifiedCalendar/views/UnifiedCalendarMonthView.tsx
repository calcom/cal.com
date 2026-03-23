import { cn } from "@calid/features/lib/cn";
import { format, isToday, startOfDay } from "date-fns";
import type { PointerEvent as ReactPointerEvent } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import { PALETTE } from "../lib/constants";
import type { UnifiedCalendarEventVM } from "../lib/types";
import { splitEventsForDay } from "../lib/utils";

interface UnifiedCalendarMonthViewProps {
  currentDate: Date;
  viewDays: Date[];
  filteredEvents: UnifiedCalendarEventVM[];
  onSelectDay: (day: Date) => void;
  onSelectEvent: (event: UnifiedCalendarEventVM) => void;
  draggingEvent: UnifiedCalendarEventVM | null;
  pendingRescheduleEventIds: Set<string>;
  hoveredDayKey: string | null;
  onStartDragEvent: (event: UnifiedCalendarEventVM, pointer: { x: number; y: number }) => void;
}

export const UnifiedCalendarMonthView = ({
  currentDate,
  viewDays,
  filteredEvents,
  onSelectDay,
  onSelectEvent,
  draggingEvent,
  pendingRescheduleEventIds,
  hoveredDayKey,
  onStartDragEvent,
}: UnifiedCalendarMonthViewProps) => {
  const { t } = useLocale();
  const monthViewDayLabels = [
    t("unified_calendar_month_day_mon"),
    t("unified_calendar_month_day_tue"),
    t("unified_calendar_month_day_wed"),
    t("unified_calendar_month_day_thu"),
    t("unified_calendar_month_day_fri"),
    t("unified_calendar_month_day_sat"),
    t("unified_calendar_month_day_sun"),
  ];

  return (
    <div>
      <div className="grid grid-cols-7 border-b border-r">
        {monthViewDayLabels.map((dayLabel) => (
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
          const isCurrentDay = isToday(day);

          return (
            <div
              key={day.toISOString()}
              className={cn(
                " hover:bg-emphasis  min-h-[150px] cursor-pointer border-b border-r p-1.5 transition-colors",
                isCurrentDay && "bg-emphasis",
                hoveredDayKey === day.toISOString() && "ring-primary/55 bg-primary/[0.05] ring-1 ring-inset"
              )}
              onClick={() => {
                if (draggingEvent) return;
                onSelectDay(day);
              }}
              data-unified-month-cell="true"
              data-unified-day-start={startOfDay(day).toISOString()}>
              <div className="mb-1 flex items-center justify-center">
                <div
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-medium",
                    isCurrentDay && " text-default "
                  )}>
                  {format(day, "d")}
                </div>
              </div>

              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((event) => {
                  return (
                    <button
                      key={event.id}
                      type="button"
                      onPointerDown={(pointerEvent: ReactPointerEvent<HTMLButtonElement>) => {
                        if (pointerEvent.button !== 0) return;
                        if (
                          !event.canReschedule ||
                          !event.internal?.bookingId ||
                          pendingRescheduleEventIds.has(event.id)
                        ) {
                          return;
                        }
                        onStartDragEvent(event, { x: pointerEvent.clientX, y: pointerEvent.clientY });
                      }}
                      className={cn(
                        "bg-muted/30 text-foreground/60 hover:bg-muted/50 w-full truncate rounded border-l-2 px-1.5 py-0.5 text-left text-[10px] transition-colors",
                        event.status === "CANCELLED" && "text-muted-foreground/50 line-through",
                        event.status === "TENTATIVE" && "border-dashed",
                        event.canReschedule &&
                          Boolean(event.internal?.bookingId) &&
                          !pendingRescheduleEventIds.has(event.id) &&
                          "cursor-grab active:cursor-grabbing",
                        pendingRescheduleEventIds.has(event.id) && "cursor-progress opacity-70",
                        draggingEvent?.id === event.id && "opacity-45"
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
                  <p className="text-muted-foreground/40 pl-1 text-[10px]">
                    {t("unified_calendar_more_count", { count: dayEvents.length - 3 })}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
