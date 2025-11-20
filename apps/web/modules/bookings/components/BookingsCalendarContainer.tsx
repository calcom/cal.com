"use client";

import { useReactTable, getCoreRowModel, getSortedRowModel } from "@tanstack/react-table";
import { createParser, useQueryState } from "nuqs";
import React, { useMemo, useEffect } from "react";

import dayjs from "@calcom/dayjs";
import { activeFiltersParser } from "@calcom/features/data-table/lib/parsers";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import { Alert } from "@calcom/ui/components/alert";

import { useBookingFilters } from "~/bookings/hooks/useBookingFilters";
import { useFacetedUniqueValues } from "~/bookings/hooks/useFacetedUniqueValues";

import { buildFilterColumns, getFilterColumnVisibility } from "../columns/filterColumns";
import { BookingDetailsSheetStoreProvider } from "../store/bookingDetailsSheetStore";
import type { RowData, BookingListingStatus, BookingOutput, BookingsGetOutput } from "../types";
import { BookingDetailsSheet } from "./BookingDetailsSheet";
import { BookingsCalendar } from "./BookingsCalendar";

// For calendar view, fetch all statuses except cancelled
const STATUSES: BookingListingStatus[] = ["upcoming", "unconfirmed", "recurring", "past"];

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
}

interface BookingsCalendarInnerProps extends BookingsCalendarContainerProps {
  data?: {
    bookings: BookingsGetOutput["bookings"];
    recurringInfo: BookingsGetOutput["recurringInfo"];
    totalCount: BookingsGetOutput["totalCount"];
  };
  isPending: boolean;
  hasError: boolean;
  errorMessage?: string;
}

function BookingsCalendarInner({
  status,
  permissions,
  data,
  isPending,
  hasError,
  errorMessage,
}: BookingsCalendarInnerProps) {
  const { t } = useLocale();
  const user = useMeQuery().data;

  const [currentWeekStart, setCurrentWeekStart] = useQueryState(
    "weekStart",
    weekStartParser.withDefault(dayjs().startOf("week"))
  );

  const ErrorView = errorMessage ? (
    <Alert severity="error" title={t("something_went_wrong")} message={errorMessage} />
  ) : undefined;

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
    <>
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
    </>
  );
}

export function BookingsCalendarContainer(props: BookingsCalendarContainerProps) {
  const { eventTypeIds, teamIds, userIds, dateRange, attendeeName, attendeeEmail, bookingUid } =
    useBookingFilters();

  const [currentWeekStart] = useQueryState("weekStart", weekStartParser.withDefault(dayjs().startOf("week")));
  const [, setActiveFilters] = useQueryState("activeFilters", activeFiltersParser);

  // Clear dateRange filter whenever it exists in calendar view
  // Calendar view uses currentWeekStart for date navigation instead of dateRange filter
  useEffect(() => {
    if (dateRange) {
      setActiveFilters((prev) => prev?.filter((filter) => filter.f !== "dateRange") ?? []);
    }
  }, [dateRange, setActiveFilters]);

  const query = trpc.viewer.bookings.get.useInfiniteQuery(
    {
      limit: 100, // Use max limit for calendar view
      filters: {
        statuses: STATUSES,
        eventTypeIds,
        teamIds,
        userIds,
        attendeeName,
        attendeeEmail,
        bookingUid,
        // Always fetch only the current week for calendar view
        afterStartDate: currentWeekStart.startOf("day").toISOString(),
        beforeEndDate: currentWeekStart.add(6, "day").endOf("day").toISOString(),
      },
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      staleTime: 5 * 60 * 1000, // 5 minutes - data is considered fresh
      gcTime: 30 * 60 * 1000, // 30 minutes - cache retention time
    }
  );

  // Automatically fetch all pages until no more data
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Flatten all pages into a single data object
  const data = useMemo(() => {
    if (!query.data?.pages) return undefined;

    // Combine all bookings from all pages
    const allBookings = query.data.pages.flatMap((page) => page.bookings);

    // recurringInfo is the same across all pages (queried globally by user, not per page)
    const recurringInfo = query.data.pages[0]?.recurringInfo ?? [];

    // totalCount is the same across all pages
    const totalCount = query.data.pages[0]?.totalCount ?? 0;

    return { bookings: allBookings, recurringInfo, totalCount };
  }, [query.data?.pages]);

  const bookings = useMemo(() => data?.bookings ?? [], [data?.bookings]);

  return (
    <BookingDetailsSheetStoreProvider bookings={bookings}>
      <BookingsCalendarInner
        {...props}
        data={data}
        isPending={query.isPending}
        hasError={!!query.error}
        errorMessage={query.error?.message}
      />
    </BookingDetailsSheetStoreProvider>
  );
}
