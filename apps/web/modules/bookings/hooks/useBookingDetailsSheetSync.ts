import { useEffect } from "react";

import { useBookingDetailsSheetStore } from "../store/bookingDetailsSheetStore";
import type { BookingOutput } from "../types";
import { useSelectedBookingId } from "./useSelectedBookingId";

/**
 * Custom hook that syncs the booking details sheet store with the URL state.
 *
 * Strategy:
 * - URL is the single source of truth
 * - Store mirrors the URL state
 * - When sheet updates store directly, we subscribe and push to URL
 */
export function useBookingDetailsSheetSync(bookings: BookingOutput[]) {
  const [selectedBookingIdFromUrl, setSelectedBookingIdToUrl] = useSelectedBookingId();
  const setStoreBookings = useBookingDetailsSheetStore((state) => state.setBookings);

  // Sync bookings array to store
  useEffect(() => {
    setStoreBookings(bookings);
  }, [bookings, setStoreBookings]);

  useEffect(() => {
    // Subscribe to store changes and sync URL → Store
    const unsubscribe = useBookingDetailsSheetStore.subscribe((state) => {
      const storeId = state.selectedBookingId;
      if (storeId !== selectedBookingIdFromUrl) {
        setSelectedBookingIdToUrl(storeId);
      }
    });

    return unsubscribe;
  }, [selectedBookingIdFromUrl, setSelectedBookingIdToUrl]);

  // Sync URL → Store
  useEffect(() => {
    const currentStoreId = useBookingDetailsSheetStore.getState().selectedBookingId;
    if (currentStoreId !== selectedBookingIdFromUrl) {
      useBookingDetailsSheetStore.getState().setSelectedBookingId(selectedBookingIdFromUrl);
    }
  }, [selectedBookingIdFromUrl]);
}
