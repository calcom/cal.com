import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns";

import type { CalendarEvent, CalendarSource, ViewMode } from "./types";

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
  events: CalendarEvent[],
  visibleCalendarIds: Set<string>,
  searchQuery: string
): CalendarEvent[] => {
  let filtered = events.filter((event) => visibleCalendarIds.has(event.calendarId));

  if (!searchQuery) return filtered;

  const query = searchQuery.toLowerCase();

  filtered = filtered.filter(
    (event) =>
      event.title.toLowerCase().includes(query) ||
      event.attendees.some((attendee) => attendee.toLowerCase().includes(query))
  );

  return filtered;
};

export const getEventConflicts = (event: CalendarEvent, allEvents: CalendarEvent[]) => {
  return allEvents.filter(
    (current) => current.id !== event.id && current.start < event.end && current.end > event.start
  );
};

export const getCurrentTimeTop = () => {
  const now = new Date();
  return ((now.getHours() * 60 + now.getMinutes()) / 1440) * 100;
};

export const createCalendarMap = (calendars: CalendarSource[]) => {
  return new Map(calendars.map((calendar) => [calendar.id, calendar]));
};
