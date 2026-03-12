import { addDays, endOfDay, endOfMonth, endOfWeek, startOfDay, startOfMonth, startOfWeek } from "date-fns";

import type { ViewMode } from "./types";

export interface UnifiedCalendarQueryRange {
  from: string;
  to: string;
  fromDate: Date;
  toDate: Date;
}

export const getUnifiedCalendarQueryRange = (
  viewMode: ViewMode,
  currentDate: Date,
  options?: {
    weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  }
): UnifiedCalendarQueryRange => {
  const weekStartsOn = options?.weekStartsOn ?? 1;

  let fromDate: Date;
  let toDate: Date;

  if (viewMode === "day") {
    fromDate = startOfDay(currentDate);
    toDate = endOfDay(currentDate);
  } else if (viewMode === "week") {
    const weekStart = startOfWeek(currentDate, { weekStartsOn });
    const weekEnd = addDays(weekStart, 6);
    fromDate = startOfDay(weekStart);
    toDate = endOfDay(weekEnd);
  } else {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    fromDate = startOfDay(startOfWeek(monthStart, { weekStartsOn }));
    toDate = endOfDay(endOfWeek(monthEnd, { weekStartsOn }));
  }

  return {
    from: fromDate.toISOString(),
    to: toDate.toISOString(),
    fromDate,
    toDate,
  };
};
