import { useEffect, useRef } from "react";

import { useBookingDetailsSheetStore } from "../store/bookingDetailsSheetStore";
import type { BookingsGetOutput } from "../types";

/**
 * Calendar-specific auto-selection logic hook.
 * Handles auto-selecting bookings when navigating across weeks in calendar view.
 *
 * - For "first": Selects as soon as the first page loads (immediate)
 * - For "last": Waits for all pages to load to ensure we get the actual last booking
 */
export function useCalendarAutoSelector(
  bookings: BookingsGetOutput["bookings"],
  hasNextPage: boolean,
  isFetchingNextPage: boolean
) {
  const pendingSelection = useBookingDetailsSheetStore((state) => state.pendingSelection);
  const setSelectedBookingUid = useBookingDetailsSheetStore((state) => state.setSelectedBookingUid);
  const clearPendingSelection = useBookingDetailsSheetStore((state) => state.clearPendingSelection);
  const setIsTransitioning = useBookingDetailsSheetStore((state) => state.setIsTransitioning);
  const bookingsRef = useRef(bookings);

  useEffect(() => {
    // Early return if no pending selection
    if (!pendingSelection) {
      return;
    }

    const hasBookingsChanged = bookings !== bookingsRef.current;
    bookingsRef.current = bookings;

    if (!hasBookingsChanged) return;

    // For "first", we can select immediately when the first page arrives
    if (pendingSelection === "first") {
      if (bookings.length === 0) {
        return;
      }

      setSelectedBookingUid(bookings[0].uid);
      setIsTransitioning(false);
      clearPendingSelection();
      return;
    }

    // For "last", wait until all pages are loaded to ensure we get the actual last booking
    if (pendingSelection === "last") {
      const isAllDataLoaded = !hasNextPage && !isFetchingNextPage;

      // Wait for all data to load AND for bookings to actually arrive
      if (!isAllDataLoaded || bookings.length === 0) {
        return;
      }

      const lastBooking = bookings[bookings.length - 1];
      setSelectedBookingUid(lastBooking.uid);

      // Clear transition state and pending selection after handling
      setIsTransitioning(false);
      clearPendingSelection();
    }
  }, [
    bookings,
    hasNextPage,
    isFetchingNextPage,
    pendingSelection,
    setSelectedBookingUid,
    clearPendingSelection,
    setIsTransitioning,
  ]);
}
