import dayjs from "@calcom/dayjs";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import { useMemo } from "react";
import type { BookingListingStatus, BookingOutput, BookingsGetOutput, RowData } from "../types";

interface UseBookingCalendarDataParams {
  data?: {
    bookings: BookingsGetOutput["bookings"];
    recurringInfo: BookingsGetOutput["recurringInfo"];
    totalCount: BookingsGetOutput["totalCount"];
  };
  status: BookingListingStatus;
}

/**
 * Custom hook to transform raw booking data into RowData format for the calendar view
 * - Deduplicates recurring bookings for recurring/unconfirmed/cancelled tabs
 * - Attaches recurring info and isToday flag to each booking
 */
export function useBookingCalendarData({ data, status }: UseBookingCalendarDataParams) {
  const user = useMeQuery().data;

  const rowData = useMemo<RowData[]>(() => {
    if (!data?.bookings) {
      return [];
    }

    // For recurring/unconfirmed/cancelled tabs: track recurring series to show only one representative booking per series
    // Key: recurringEventId, Value: array of all bookings in that series
    const shownBookings: Record<string, BookingOutput[]> = {};

    const filterBookings = (booking: BookingOutput) => {
      // Deduplicate recurring bookings for specific status tabs
      // This ensures we show only ONE booking per recurring series instead of all occurrences
      if (status === "recurring" || status == "unconfirmed" || status === "cancelled") {
        // Non-recurring bookings are always shown
        if (!booking.recurringEventId) {
          return true;
        }

        // If we've already encountered this recurring series
        if (
          shownBookings[booking.recurringEventId] !== undefined &&
          shownBookings[booking.recurringEventId].length > 0
        ) {
          // Store this occurrence but DON'T display it (return false to filter out)
          shownBookings[booking.recurringEventId].push(booking);
          return false;
        }

        // First occurrence of this recurring series - show it and start tracking
        shownBookings[booking.recurringEventId] = [booking];
      }
      return true;
    };

    return data.bookings.filter(filterBookings).map((booking) => {
      const bookingDate = dayjs(booking.startTime).tz(user?.timeZone);
      const today = dayjs().tz(user?.timeZone).format("YYYY-MM-DD");
      const bookingDateStr = bookingDate.format("YYYY-MM-DD");

      return {
        type: "data" as const,
        booking,
        isToday: bookingDateStr === today,
        recurringInfo: data.recurringInfo.find((info) => info.recurringEventId === booking.recurringEventId),
      };
    });
  }, [data, status, user?.timeZone]);

  return rowData;
}
