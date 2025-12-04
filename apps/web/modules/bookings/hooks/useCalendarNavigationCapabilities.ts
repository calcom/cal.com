import { useMemo } from "react";

import dayjs from "@calcom/dayjs";

import type { NavigationCapabilities } from "../store/bookingDetailsSheetStore";

interface UseCalendarNavigationCapabilitiesProps {
  currentWeekStart: dayjs.Dayjs;
  setCurrentWeekStart: (date: dayjs.Dayjs) => void;
}

/**
 * Calendar view navigation capabilities adapter.
 * Provides week-based navigation logic for the booking details sheet.
 *
 * This hook:
 * - Calculates next/previous week dates
 * - Updates the calendar view's selected week (no data fetching)
 */
export function useCalendarNavigationCapabilities({
  currentWeekStart,
  setCurrentWeekStart,
}: UseCalendarNavigationCapabilitiesProps): NavigationCapabilities {
  const nextWeekStart = useMemo(() => currentWeekStart.add(1, "week"), [currentWeekStart]);

  const prevWeekStart = useMemo(() => currentWeekStart.subtract(1, "week"), [currentWeekStart]);

  return useMemo(
    () => ({
      canNavigateToNextPeriod: () => true,
      canNavigateToPreviousPeriod: () => true,

      requestNextPeriod: () => {
        setCurrentWeekStart(nextWeekStart);
      },

      requestPreviousPeriod: () => {
        setCurrentWeekStart(prevWeekStart);
      },
    }),
    [nextWeekStart, prevWeekStart, setCurrentWeekStart]
  );
}
