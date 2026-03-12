import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isWithinInterval,
  max,
  min,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns";

import type { UnifiedCalendarEventVM, ViewMode } from "./types";

export const navigateDate = (currentDate: Date, viewMode: ViewMode, direction: "prev" | "next") => {
  if (viewMode === "day") return direction === "next" ? addDays(currentDate, 1) : subDays(currentDate, 1);
  if (viewMode === "week") return direction === "next" ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1);
  return direction === "next" ? addMonths(currentDate, 1) : subMonths(currentDate, 1);
};

export const getViewDays = (currentDate: Date, viewMode: ViewMode) => {
  if (viewMode === "day") return [currentDate];

  if (viewMode === "week") {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end: addDays(start, 6) });
  }

  const start = startOfMonth(currentDate);
  const end = endOfMonth(currentDate);

  return eachDayOfInterval({
    start: startOfWeek(start, { weekStartsOn: 1 }),
    end: endOfWeek(end, { weekStartsOn: 1 }),
  });
};

export const getHeaderTitle = (currentDate: Date, viewMode: ViewMode) => {
  if (viewMode === "day") return format(currentDate, "EEEE, MMMM d, yyyy");

  if (viewMode === "week") {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    return `${format(start, "MMM d")} – ${format(addDays(start, 6), "MMM d, yyyy")}`;
  }

  return format(currentDate, "MMMM yyyy");
};

export const filterEvents = (
  events: UnifiedCalendarEventVM[],
  visibleCalendarIds: Set<string>,
  searchQuery: string
): UnifiedCalendarEventVM[] => {
  const filtered = events.filter((event) => {
    if (event.source === "INTERNAL") {
      return true;
    }

    if (!event.calendarId) {
      return true;
    }

    return visibleCalendarIds.has(event.calendarId);
  });

  if (!searchQuery) return filtered;

  const query = searchQuery.toLowerCase();

  return filtered.filter((event) => {
    return (
      event.title.toLowerCase().includes(query) ||
      event.description?.toLowerCase().includes(query) ||
      event.location?.toLowerCase().includes(query)
    );
  });
};

export const getEventConflicts = (event: UnifiedCalendarEventVM, allEvents: UnifiedCalendarEventVM[]) => {
  return allEvents.filter(
    (current) => current.id !== event.id && current.start < event.end && current.end > event.start
  );
};

export const getCurrentTimeTop = () => {
  const now = new Date();
  return ((now.getHours() * 60 + now.getMinutes()) / 1440) * 100;
};

export const isAllDayEventOnDay = (event: UnifiedCalendarEventVM, day: Date) => {
  if (!event.isAllDay) return false;

  const dayStart = startOfDay(day);
  const dayEnd = endOfDay(day);

  return event.start <= dayEnd && event.end > dayStart;
};

export const isTimedEventOnDay = (event: UnifiedCalendarEventVM, day: Date) => {
  if (event.isAllDay) return false;
  return isSameDay(event.start, day);
};

export const splitEventsForDay = (events: UnifiedCalendarEventVM[], day: Date) => {
  const allDayEvents = events.filter((event) => isAllDayEventOnDay(event, day));
  const timedEvents = events.filter((event) => isTimedEventOnDay(event, day));

  return { allDayEvents, timedEvents };
};

export const eventStartsOrOverlapsDay = (event: UnifiedCalendarEventVM, day: Date) => {
  if (event.isAllDay) return isAllDayEventOnDay(event, day);

  const dayStart = startOfDay(day);
  const dayEnd = endOfDay(day);
  const eventStart = max([event.start, dayStart]);
  const eventEnd = min([event.end, dayEnd]);

  return isWithinInterval(eventStart, { start: dayStart, end: dayEnd }) && eventEnd >= eventStart;
};
