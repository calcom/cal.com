import { trpc } from "@calcom/trpc/react";
import { useEffect, useRef } from "react";
import { validStatuses } from "../lib/validStatuses";
import { useBookingDetailsSheetStore } from "../store/bookingDetailsSheetStore";
import type { BookingOutput } from "../types";

/**
 * Resolves the booking to display in the sheet, with fallback for off-page bookings.
 *
 * Priority: store booking > fallback query > last known booking.
 * The fallback query fires only when a booking is selected but not on the current page
 * (e.g. deep-linked booking pushed to page 2+ by newer bookings).
 *
 * Both queries live here (not in BookingDetailsSheetInner) so they survive inner
 * component unmount/remount cycles caused by store/URL sync state changes.
 */
export function useResolvedBooking() {
  const booking = useBookingDetailsSheetStore((state) => state.getSelectedBooking());
  const selectedBookingUid = useBookingDetailsSheetStore((state) => state.selectedBookingUid);
  const lastBookingRef = useRef<BookingOutput | null>(null);

  const { data: bookingDetails } = trpc.viewer.bookings.getBookingDetails.useQuery(
    { uid: selectedBookingUid! },
    {
      enabled: !!selectedBookingUid,
      staleTime: 5 * 60 * 1000,
    }
  );

  // Deep-linked bookings may not be on the current page (e.g. pushed to page 2+
  // by newer bookings). bookings.get is used instead of getBookingForTabResolution
  // because the sheet needs the full BookingOutput shape to render details.
  const { data: fallbackData } = trpc.viewer.bookings.get.useQuery(
    {
      limit: 1,
      offset: 0,
      filters: {
        bookingUid: selectedBookingUid!,
        statuses: [...validStatuses],
      },
    },
    {
      enabled: !!selectedBookingUid && !booking,
      staleTime: 5 * 60 * 1000,
    }
  );
  const fallbackBooking = fallbackData?.bookings?.[0] ?? null;

  useEffect(() => {
    if (booking || fallbackBooking) {
      lastBookingRef.current = booking ?? fallbackBooking;
    }
    if (!selectedBookingUid) {
      lastBookingRef.current = null;
    }
  }, [booking, fallbackBooking, selectedBookingUid]);

  const resolvedBooking = booking ?? fallbackBooking ?? lastBookingRef.current;

  return { resolvedBooking, bookingDetails };
}
