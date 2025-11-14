import { useMemo, useCallback } from "react";

import type { BookingOutput } from "../types";

export function useBookingCursor({
  bookings,
  selectedBookingId,
  setSelectedBookingId,
}: {
  bookings: BookingOutput[];
  selectedBookingId: number | null;
  setSelectedBookingId: (bookingId: number | null) => void;
}) {
  const currentIndex = useMemo(
    () => bookings.findIndex((booking) => selectedBookingId && booking.id === selectedBookingId),
    [bookings, selectedBookingId]
  );

  const onPrevious = useCallback(() => {
    if (currentIndex >= 1) {
      setSelectedBookingId(bookings[currentIndex - 1].id);
    }
  }, [bookings, currentIndex, setSelectedBookingId]);

  const onNext = useCallback(() => {
    if (currentIndex >= 0 && currentIndex < bookings.length - 1) {
      setSelectedBookingId(bookings[currentIndex + 1].id);
    }
  }, [bookings, currentIndex, setSelectedBookingId]);

  return {
    onPrevious,
    onNext,
    hasPrevious: currentIndex > 0,
    hasNext: currentIndex < bookings.length - 1 && currentIndex >= 0,
  };
}
