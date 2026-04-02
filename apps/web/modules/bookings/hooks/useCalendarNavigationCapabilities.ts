import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import { trpc } from "@calcom/trpc/react";
import { useCallback, useEffect, useMemo } from "react";
import { getWeekStart } from "../lib/weekUtils";
import type { NavigationCapabilities } from "../store/bookingDetailsSheetStore";
import type { BookingListingStatus } from "../types";
import { useNearestFutureBooking } from "./useNearestFutureBooking";
import { useNearestPastBooking } from "./useNearestPastBooking";

interface UseCalendarNavigationCapabilitiesProps {
  currentWeekStart: Dayjs;
  setCurrentWeekStart: (date: Dayjs) => void;
  userWeekStart: number;
  /** Filters to use for probe queries and prefetching */
  filters: {
    statuses: BookingListingStatus[];
    userIds?: number[];
  };
}

/**
 * Calendar view navigation capabilities adapter.
 * Provides week-based navigation logic for the booking details sheet.
 *
 * This hook:
 * - Uses probe queries to find nearest bookings in each direction
 * - Jumps directly to the week containing the nearest booking (not just adjacent week)
 * - Disables navigation buttons when no bookings exist in that direction
 * - Prefetches booking data for the target weeks to improve navigation performance
 */
export function useCalendarNavigationCapabilities({
  currentWeekStart,
  setCurrentWeekStart,
  userWeekStart,
  filters,
}: UseCalendarNavigationCapabilitiesProps): NavigationCapabilities {
  const trpcUtils = trpc.useUtils();

  // Probe queries for navigation - find nearest bookings in each direction
  const { nearestBooking: nearestFutureBooking } = useNearestFutureBooking({
    currentWeekStart,
    filters,
  });

  const { nearestBooking: nearestPastBooking } = useNearestPastBooking({
    currentWeekStart,
    filters,
  });

  const hasFutureBooking = !!nearestFutureBooking;
  const hasPastBooking = !!nearestPastBooking;
  const nextBookingDate = nearestFutureBooking?.startTime?.toString() ?? null;
  const prevBookingDate = nearestPastBooking?.startTime?.toString() ?? null;

  // Calculate target week starts for prefetching
  const nextWeekStart = useMemo(() => {
    if (!nextBookingDate) return null;
    return getWeekStart(dayjs(nextBookingDate), userWeekStart);
  }, [nextBookingDate, userWeekStart]);

  const prevWeekStart = useMemo(() => {
    if (!prevBookingDate) return null;
    return getWeekStart(dayjs(prevBookingDate), userWeekStart);
  }, [prevBookingDate, userWeekStart]);

  // Prefetch bookings for the next week with bookings
  // Uses prefetchInfinite to match the useInfiniteQuery used in BookingCalendarContainer
  useEffect(() => {
    if (!nextWeekStart) return;

    trpcUtils.viewer.bookings.get.prefetchInfinite({
      limit: 100,
      filters: {
        statuses: filters.statuses,
        userIds: filters.userIds,
        afterStartDate: nextWeekStart.startOf("day").toISOString(),
        beforeEndDate: nextWeekStart.add(6, "day").endOf("day").toISOString(),
      },
    });
  }, [nextWeekStart, filters.statuses, filters.userIds, trpcUtils]);

  // Prefetch bookings for the previous week with bookings
  // Uses prefetchInfinite to match the useInfiniteQuery used in BookingCalendarContainer
  useEffect(() => {
    if (!prevWeekStart) return;

    trpcUtils.viewer.bookings.get.prefetchInfinite({
      limit: 100,
      filters: {
        statuses: filters.statuses,
        userIds: filters.userIds,
        afterStartDate: prevWeekStart.startOf("day").toISOString(),
        beforeEndDate: prevWeekStart.add(6, "day").endOf("day").toISOString(),
      },
    });
  }, [prevWeekStart, filters.statuses, filters.userIds, trpcUtils]);

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
