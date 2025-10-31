import { useMemo, useCallback } from "react";

import type { RowData, BookingOutput } from "../types";

function isDataRow(row: RowData): row is Extract<RowData, { type: "data" }> {
  return row.type === "data";
}

export function useBookingCursor({
  bookings,
  selectedBooking,
  setSelectedBooking,
}: {
  bookings: RowData[];
  selectedBooking: BookingOutput | null;
  setSelectedBooking: (booking: BookingOutput | null) => void;
}) {
  const bookingRows = useMemo(() => bookings.filter(isDataRow), [bookings]);

  const currentIndex = useMemo(
    () => bookingRows.findIndex((row) => selectedBooking && row.booking.id === selectedBooking.id),
    [bookingRows, selectedBooking]
  );

  const onPrevious = useCallback(() => {
    if (currentIndex >= 1) {
      setSelectedBooking(bookingRows[currentIndex - 1].booking);
    }
  }, [bookingRows, currentIndex, setSelectedBooking]);

  const onNext = useCallback(() => {
    if (currentIndex >= 0 && currentIndex < bookingRows.length - 1) {
      setSelectedBooking(bookingRows[currentIndex + 1].booking);
    }
  }, [bookingRows, currentIndex, setSelectedBooking]);

  return {
    onPrevious,
    onNext,
    hasPrevious: currentIndex > 0,
    hasNext: currentIndex < bookingRows.length - 1 && currentIndex >= 0,
  };
}
