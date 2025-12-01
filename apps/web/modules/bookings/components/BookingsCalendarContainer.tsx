"use client";

import { useReactTable, getCoreRowModel, getSortedRowModel } from "@tanstack/react-table";
import { createParser, useQueryState } from "nuqs";
import { useMemo } from "react";

import dayjs from "@calcom/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";

import { useFacetedUniqueValues } from "~/bookings/hooks/useFacetedUniqueValues";

import { buildFilterColumns, getFilterColumnVisibility } from "../columns/filterColumns";
import { BookingDetailsSheetStoreProvider } from "../store/bookingDetailsSheetStore";
import type { RowData, BookingListingStatus, BookingsGetOutput, BookingOutput } from "../types";
import { BookingDetailsSheet } from "./BookingDetailsSheet";
import { BookingsCalendar } from "./BookingsCalendar";

const weekStartParser = createParser({
  parse: (value: string) => {
    const parsed = dayjs(value);
    return parsed.isValid() ? parsed.startOf("week") : dayjs().startOf("week");
  },
  serialize: (value: dayjs.Dayjs) => value.format("YYYY-MM-DD"),
});

interface BookingsCalendarContainerProps {
  status: BookingListingStatus;
  permissions: {
    canReadOthersBookings: boolean;
  };
  data?: BookingsGetOutput;
  isPending?: boolean;
  ErrorView?: React.ReactNode;
  hasError?: boolean;
}

export function BookingsCalendarContainer({
  status,
  permissions,
  data,
  isPending = false,
  ErrorView,
  hasError,
}: BookingsCalendarContainerProps) {
  const { t } = useLocale();
  const user = useMeQuery().data;

  const [currentWeekStart, setCurrentWeekStart] = useQueryState(
    "weekStart",
    weekStartParser.withDefault(dayjs().startOf("week"))
  );

  const columns = useMemo(() => {
    return buildFilterColumns({ t, permissions, status });
  }, [t, permissions, status]);

  const getFacetedUniqueValues = useFacetedUniqueValues();

  /**
   * Transform raw booking data into RowData format for the calendar view
   * - Deduplicates recurring bookings for recurring/unconfirmed/cancelled tabs
   * - Attaches recurring info and isToday flag to each booking
   */
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

  const table = useReactTable<RowData>({
    data: rowData,
    columns,
    initialState: {
      columnVisibility: getFilterColumnVisibility(),
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedUniqueValues,
  });

  // Extract bookings from table data and filter by current week
  const bookings = useMemo(() => {
    const weekStart = currentWeekStart;
    const weekEnd = currentWeekStart.add(6, "day");

    return rowData
      .filter((row): row is Extract<RowData, { type: "data" }> => row.type === "data")
      .map((row) => row.booking)
      .filter((booking) => {
        const bookingStart = dayjs(booking.startTime);
        return (
          (bookingStart.isAfter(weekStart) || bookingStart.isSame(weekStart, "day")) &&
          bookingStart.isBefore(weekEnd.endOf("day"))
        );
      });
  }, [rowData, currentWeekStart]);

  return (
    <BookingDetailsSheetStoreProvider bookings={bookings}>
      <BookingsCalendar
        status={status}
        table={table}
        isPending={isPending}
        currentWeekStart={currentWeekStart}
        setCurrentWeekStart={setCurrentWeekStart}
        bookings={bookings}
        ErrorView={ErrorView}
        hasError={hasError}
      />

      <BookingDetailsSheet
        userTimeZone={user?.timeZone}
        userTimeFormat={user?.timeFormat === null ? undefined : user?.timeFormat}
        userId={user?.id}
        userEmail={user?.email}
      />
    </BookingDetailsSheetStoreProvider>
  );
}
