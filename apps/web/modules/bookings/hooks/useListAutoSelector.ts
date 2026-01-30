import { useEffect, useRef } from "react";
import { useBookingDetailsSheetStore } from "../store/bookingDetailsSheetStore";
import type { BookingsGetOutput } from "../types";

/**
 * List-specific auto-selection logic hook.
 * Handles auto-selecting bookings when navigating across pages in list view.
 * For list view, data is loaded per page, so we can select immediately when bookings change.
 */
export function useListAutoSelector(bookings: BookingsGetOutput["bookings"]) {
  const pendingSelection = useBookingDetailsSheetStore((state) => state.pendingSelection);
  const setSelectedBookingUid = useBookingDetailsSheetStore((state) => state.setSelectedBookingUid);
  const clearPendingSelection = useBookingDetailsSheetStore((state) => state.clearPendingSelection);
  const setIsTransitioning = useBookingDetailsSheetStore((state) => state.setIsTransitioning);
  const bookingsRef = useRef(bookings);

  useEffect(() => {
    const hasBookingsChanged = bookings !== bookingsRef.current;
    // Always track current bookings to avoid stale ref when pendingSelection is later set
    bookingsRef.current = bookings;

    // Early return if no pending selection
    if (!pendingSelection) return;

    if (!hasBookingsChanged) return;

    if (bookings.length > 0) {
      const bookingToSelect = pendingSelection === "first" ? bookings[0] : bookings[bookings.length - 1];
      setSelectedBookingUid(bookingToSelect.uid);
    }

    // Always clear transition state and pending selection after handling
    setIsTransitioning(false);
    clearPendingSelection();
  }, [bookings, pendingSelection, setSelectedBookingUid, clearPendingSelection, setIsTransitioning]);
}
