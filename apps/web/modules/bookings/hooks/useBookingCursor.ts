import { useCallback, useMemo } from "react";
import type { BookingOutput } from "../types";

export function useBookingCursor({
  bookings,
  selectedBookingUid,
  setSelectedBookingUid,
}: {
  bookings: BookingOutput[];
  selectedBookingUid: string | null;
  setSelectedBookingUid: (bookingUid: string | null) => void;
}) {
  const currentIndex = useMemo(
    () => bookings.findIndex((booking) => selectedBookingUid && booking.uid === selectedBookingUid),
    [bookings, selectedBookingUid]
  );

  const onPrevious = useCallback(() => {
    if (currentIndex >= 1) {
      setSelectedBookingUid(bookings[currentIndex - 1].uid);
    }
  }, [bookings, currentIndex, setSelectedBookingUid]);

  const onNext = useCallback(() => {
    if (currentIndex >= 0 && currentIndex < bookings.length - 1) {
      setSelectedBookingUid(bookings[currentIndex + 1].uid);
    }
  }, [bookings, currentIndex, setSelectedBookingUid]);

  return {
    onPrevious,
    onNext,
    hasPrevious: currentIndex > 0,
    hasNext: currentIndex < bookings.length - 1 && currentIndex >= 0,
  };
}
