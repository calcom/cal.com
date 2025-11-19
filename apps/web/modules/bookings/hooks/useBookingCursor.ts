import { useMemo, useCallback } from "react";

import type { RowData } from "../types";

function isDataRow(row: RowData): row is Extract<RowData, { type: "data" }> {
  return row.type === "data";
}

export function useBookingCursor({
  bookings,
  selectedBookingId,
  setSelectedBookingId,
}: {
  bookings: RowData[];
  selectedBookingId: number | null;
  setSelectedBookingId: (bookingId: number | null) => void;
}) {
  const bookingRows = useMemo(() => bookings.filter(isDataRow), [bookings]);

  const currentIndex = useMemo(
    () => bookingRows.findIndex((row) => selectedBookingId && row.booking.id === selectedBookingId),
    [bookingRows, selectedBookingId]
  );

  const onPrevious = useCallback(() => {
    if (currentIndex >= 1) {
      setSelectedBookingId(bookingRows[currentIndex - 1].booking.id);
    }
  }, [bookingRows, currentIndex, setSelectedBookingId]);

  const onNext = useCallback(() => {
    if (currentIndex >= 0 && currentIndex < bookingRows.length - 1) {
      setSelectedBookingId(bookingRows[currentIndex + 1].booking.id);
    }
  }, [bookingRows, currentIndex, setSelectedBookingId]);

  return {
    onPrevious,
    onNext,
    hasPrevious: currentIndex > 0,
    hasNext: currentIndex < bookingRows.length - 1 && currentIndex >= 0,
  };
}
