import type { CalendarEvent, CalendarSource, ViewMode } from "../lib/types";
import { UnifiedCalendarDayView } from "../views/UnifiedCalendarDayView";
import { UnifiedCalendarMonthView } from "../views/UnifiedCalendarMonthView";
import { UnifiedCalendarWeekView } from "../views/UnifiedCalendarWeekView";

interface UnifiedCalendarGridProps {
  viewMode: ViewMode;
  currentDate: Date;
  viewDays: Date[];
  filteredEvents: CalendarEvent[];
  calendarMap: Map<string, CalendarSource>;
  getConflicts: (event: CalendarEvent) => CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
  onQuickBookSlot: (slot: { date: Date; hour: number }) => void;
  onSelectDay: (day: Date) => void;
}

export const UnifiedCalendarGrid = ({
  viewMode,
  currentDate,
  viewDays,
  filteredEvents,
  calendarMap,
  getConflicts,
  onSelectEvent,
  onQuickBookSlot,
  onSelectDay,
}: UnifiedCalendarGridProps) => {
  if (viewMode === "day") {
    return (
      <UnifiedCalendarDayView
        currentDate={currentDate}
        filteredEvents={filteredEvents}
        calendarMap={calendarMap}
        getConflicts={getConflicts}
        onSelectEvent={onSelectEvent}
        onQuickBookSlot={onQuickBookSlot}
      />
    );
  }

  if (viewMode === "week") {
    return (
      <UnifiedCalendarWeekView
        viewDays={viewDays}
        filteredEvents={filteredEvents}
        calendarMap={calendarMap}
        getConflicts={getConflicts}
        onSelectEvent={onSelectEvent}
        onQuickBookSlot={onQuickBookSlot}
        onSelectDay={onSelectDay}
      />
    );
  }

  return (
    <UnifiedCalendarMonthView
      currentDate={currentDate}
      viewDays={viewDays}
      filteredEvents={filteredEvents}
      calendarMap={calendarMap}
      onSelectDay={onSelectDay}
      onSelectEvent={onSelectEvent}
    />
  );
};
