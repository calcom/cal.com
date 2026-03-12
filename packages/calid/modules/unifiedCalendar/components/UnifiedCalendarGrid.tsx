import type { UnifiedCalendarEventVM, ViewMode } from "../lib/types";
import { UnifiedCalendarDayView } from "../views/UnifiedCalendarDayView";
import { UnifiedCalendarMonthView } from "../views/UnifiedCalendarMonthView";
import { UnifiedCalendarWeekView } from "../views/UnifiedCalendarWeekView";

interface UnifiedCalendarGridProps {
  viewMode: ViewMode;
  currentDate: Date;
  viewDays: Date[];
  filteredEvents: UnifiedCalendarEventVM[];
  getConflicts: (event: UnifiedCalendarEventVM) => UnifiedCalendarEventVM[];
  onSelectEvent: (event: UnifiedCalendarEventVM) => void;
  onQuickBookSlot: (slot: { date: Date; hour: number }) => void;
  onSelectDay: (day: Date) => void;
}

export const UnifiedCalendarGrid = ({
  viewMode,
  currentDate,
  viewDays,
  filteredEvents,
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
      onSelectDay={onSelectDay}
      onSelectEvent={onSelectEvent}
    />
  );
};
