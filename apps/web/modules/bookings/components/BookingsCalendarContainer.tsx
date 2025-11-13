"use client";

import { useReactTable, getCoreRowModel, getSortedRowModel } from "@tanstack/react-table";
import { createParser, useQueryState } from "nuqs";
import { useCallback, useMemo } from "react";

import dayjs from "@calcom/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";

import { useFacetedUniqueValues } from "~/bookings/hooks/useFacetedUniqueValues";

import { buildFilterColumns, getFilterColumnVisibility } from "../columns/filterColumns";
import { useBookingCursor } from "../hooks/useBookingCursor";
import { useSelectedBookingId } from "../hooks/useSelectedBookingId";
import type { RowData, BookingListingStatus } from "../types";
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
  data: RowData[];
  isPending?: boolean;
}

export function BookingsCalendarContainer({
  status,
  permissions,
  data,
  isPending = false,
}: BookingsCalendarContainerProps) {
  const { t } = useLocale();
  const user = useMeQuery().data;

  const [selectedBookingId, setSelectedBookingId] = useSelectedBookingId();
  const [currentWeekStart, setCurrentWeekStart] = useQueryState(
    "weekStart",
    weekStartParser.withDefault(dayjs().startOf("week"))
  );

  const onOpenDetails = useCallback(
    (bookingId: number) => {
      setSelectedBookingId(bookingId);
    },
    [setSelectedBookingId]
  );

  const columns = useMemo(() => {
    return buildFilterColumns({ t, permissions, status });
  }, [t, permissions, status]);

  const getFacetedUniqueValues = useFacetedUniqueValues();

  const table = useReactTable<RowData>({
    data,
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

    return data
      .filter((row): row is Extract<RowData, { type: "data" }> => row.type === "data")
      .map((row) => row.booking)
      .filter((booking) => {
        const bookingStart = dayjs(booking.startTime);
        return (
          (bookingStart.isAfter(weekStart) || bookingStart.isSame(weekStart, "day")) &&
          bookingStart.isBefore(weekEnd.endOf("day"))
        );
      });
  }, [data, currentWeekStart]);

  const selectedBooking = useMemo(() => {
    if (!selectedBookingId) return null;
    return bookings.find((booking) => booking.id === selectedBookingId) ?? null;
  }, [selectedBookingId, bookings]);

  const bookingNavigation = useBookingCursor({
    bookings,
    selectedBookingId,
    setSelectedBookingId,
  });

  return (
    <>
      <BookingsCalendar
        status={status}
        table={table}
        isPending={isPending}
        onOpenDetails={onOpenDetails}
        currentWeekStart={currentWeekStart}
        setCurrentWeekStart={setCurrentWeekStart}
        bookings={bookings}
      />

      <BookingDetailsSheet
        booking={selectedBooking}
        isOpen={!!selectedBooking}
        onClose={() => setSelectedBookingId(null)}
        userTimeZone={user?.timeZone}
        userTimeFormat={user?.timeFormat === null ? undefined : user?.timeFormat}
        userId={user?.id}
        userEmail={user?.email}
        onPrevious={bookingNavigation.onPrevious}
        hasPrevious={bookingNavigation.hasPrevious}
        onNext={bookingNavigation.onNext}
        hasNext={bookingNavigation.hasNext}
      />
    </>
  );
}
