import { useCallback, useMemo } from "react";

import dayjs from "@calcom/dayjs";

import { getWeekStart } from "../lib/weekUtils";
import type { NavigationCapabilities } from "../store/bookingDetailsSheetStore";

interface UseCalendarNavigationCapabilitiesProps {
  currentWeekStart: dayjs.Dayjs;
  setCurrentWeekStart: (date: dayjs.Dayjs) => void;
  userWeekStart: number;
  /** Start time of the nearest future booking (from probe query) */
  nextBookingDate: string | null;
  /** Start time of the nearest past booking (from probe query) */
  prevBookingDate: string | null;
  /** Whether there is a future booking within the probe window */
  hasFutureBooking: boolean;
  /** Whether there is a past booking within the probe window */
  hasPastBooking: boolean;
}

/**
 * Calendar view navigation capabilities adapter.
 * Provides week-based navigation logic for the booking details sheet.
 *
 * This hook:
 * - Uses probe query results to determine if navigation is possible
 * - Jumps directly to the week containing the nearest booking (not just adjacent week)
 * - Disables navigation buttons when no bookings exist in that direction
 */
export function useCalendarNavigationCapabilities({
  setCurrentWeekStart,
  userWeekStart,
  nextBookingDate,
  prevBookingDate,
  hasFutureBooking,
  hasPastBooking,
}: UseCalendarNavigationCapabilitiesProps): NavigationCapabilities {
  const canNavigateToNextPeriod = useCallback(() => hasFutureBooking, [hasFutureBooking]);

  const canNavigateToPreviousPeriod = useCallback(() => hasPastBooking, [hasPastBooking]);

  const requestNextPeriod = useCallback(() => {
    if (!nextBookingDate) return;
    const targetWeekStart = getWeekStart(dayjs(nextBookingDate), userWeekStart);
    setCurrentWeekStart(targetWeekStart);
  }, [nextBookingDate, setCurrentWeekStart, userWeekStart]);

  const requestPreviousPeriod = useCallback(() => {
    if (!prevBookingDate) return;
    const targetWeekStart = getWeekStart(dayjs(prevBookingDate), userWeekStart);
    setCurrentWeekStart(targetWeekStart);
  }, [prevBookingDate, setCurrentWeekStart, userWeekStart]);

  return useMemo(
    () => ({
      canNavigateToNextPeriod,
      canNavigateToPreviousPeriod,
      requestNextPeriod,
      requestPreviousPeriod,
    }),
    [canNavigateToNextPeriod, canNavigateToPreviousPeriod, requestNextPeriod, requestPreviousPeriod]
  );
}
