"use client";

import { useReactTable, getCoreRowModel, getSortedRowModel } from "@tanstack/react-table";
import { createParser, useQueryState } from "nuqs";
import React, { useMemo, useEffect } from "react";

import dayjs from "@calcom/dayjs";
import { DataTableFilters } from "@calcom/features/data-table";
import { activeFiltersParser } from "@calcom/features/data-table/lib/parsers";
import { weekdayToWeekIndex } from "@calcom/lib/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import { Alert } from "@calcom/ui/components/alert";

import { useBookingFilters } from "~/bookings/hooks/useBookingFilters";
import { useFacetedUniqueValues } from "~/bookings/hooks/useFacetedUniqueValues";

import { buildFilterColumns, getFilterColumnVisibility } from "../columns/filterColumns";
import { getWeekStart } from "../lib/weekUtils";
import { BookingDetailsSheetStoreProvider } from "../store/bookingDetailsSheetStore";
import type { RowData, BookingListingStatus, BookingOutput, BookingsGetOutput } from "../types";
import { BookingCalendarView } from "./BookingCalendarView";
import { BookingDetailsSheet } from "./BookingDetailsSheet";
import { ViewToggleButton } from "./ViewToggleButton";

// For calendar view, fetch all statuses except cancelled
const STATUSES: BookingListingStatus[] = ["upcoming", "unconfirmed", "recurring", "past"];

/**
 * Parser for the weekStart query parameter
 * This parser simply parses the date from the URL and ensures it's at the start of the day.
 * The week start logic based on user preference is applied when determining the default value.
 */
const weekStartParser = createParser({
  parse: (value: string) => {
    const parsed = dayjs(value);
    return parsed.isValid() ? parsed.startOf("day") : dayjs().startOf("day");
  },
  serialize: (value: dayjs.Dayjs) => value.format("YYYY-MM-DD"),
});

/**
 * Custom hook to manage the current week start based on user preferences
 * @returns Object containing currentWeekStart state and userWeekStart preference
 */
function useCurrentWeekStart() {
  const user = useMeQuery().data;

  // Get the user's preferred week start day (0-6, where 0 = Sunday)
  const userWeekStart = weekdayToWeekIndex(user?.weekStart);

  const [currentWeekStart, setCurrentWeekStart] = useQueryState(
    "weekStart",
    weekStartParser.withDefault(getWeekStart(dayjs(), userWeekStart))
  );

  return {
    currentWeekStart,
    setCurrentWeekStart,
    userWeekStart,
  };
}

/**
 * Custom hook to manage allowed filters for calendar view
 * - Auto-selects first allowed filter when no filters are active
 * - Removes disallowed filters when transitioning from list view
 */
function useAllowedFilters({
  canReadOthersBookings,
  activeFilters,
  setActiveFilters,
}: {
  canReadOthersBookings: boolean;
  activeFilters: Array<{ f: string }>;
  setActiveFilters: (filters: Array<{ f: string }>) => void;
}) {
  const allowedFilterIds = useMemo(() => (canReadOthersBookings ? ["userId"] : []), [canReadOthersBookings]);

  useEffect(() => {
    // Auto-select first allowed filter when no filters are active and filters are available
    // Actually this is to show "Member" filter automatically for owner / admin users,
    // because we only support that filter on the calendar view.
    if (activeFilters.length === 0 && allowedFilterIds.length > 0) {
      setActiveFilters([{ f: allowedFilterIds[0] }]);
      return;
    }

    // Clear all the non-allowed filters (in case coming from list view)
    const filteredActiveFilters = activeFilters.filter((filter) => allowedFilterIds.includes(filter.f));
    const hasDisallowedFilters = filteredActiveFilters.length !== activeFilters.length;

    if (hasDisallowedFilters) {
      setActiveFilters(filteredActiveFilters);
    }
  }, [allowedFilterIds, activeFilters, setActiveFilters]);

  return allowedFilterIds;
}

interface BookingCalendarContainerProps {
  status: BookingListingStatus;
  permissions: {
    canReadOthersBookings: boolean;
  };
}

interface BookingCalendarInnerProps extends BookingCalendarContainerProps {
  data?: {
    bookings: BookingsGetOutput["bookings"];
    recurringInfo: BookingsGetOutput["recurringInfo"];
    totalCount: BookingsGetOutput["totalCount"];
  };
  allowedFilterIds: string[];
  isPending: boolean;
  hasError: boolean;
  errorMessage?: string;
}

function BookingCalendarInner({
  status,
  permissions,
  data,
  allowedFilterIds,
  isPending,
  hasError,
  errorMessage,
}: BookingCalendarInnerProps) {
  const { t } = useLocale();
  const user = useMeQuery().data;
  const { currentWeekStart, setCurrentWeekStart, userWeekStart } = useCurrentWeekStart();

  const ErrorView = errorMessage ? (
    <Alert severity="error" title={t("something_went_wrong")} message={errorMessage} />
  ) : undefined;

  const columns = useMemo(() => {
    return buildFilterColumns({ t, permissions, status }).filter((column) =>
      allowedFilterIds.includes(column.id || "")
    );
  }, [allowedFilterIds, t, permissions, status]);

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
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {allowedFilterIds.length > 0 && <DataTableFilters.FilterBar table={table} />}
        </div>

        <div className="flex items-center gap-2">
          <ViewToggleButton />
        </div>
      </div>
      {hasError && ErrorView ? (
        ErrorView
      ) : (
        <BookingCalendarView
          bookings={bookings}
          currentWeekStart={currentWeekStart}
          onWeekStartChange={setCurrentWeekStart}
          isPending={isPending}
          userWeekStart={userWeekStart}
        />
      )}

      <BookingDetailsSheet
        userTimeZone={user?.timeZone}
        userTimeFormat={user?.timeFormat === null ? undefined : user?.timeFormat}
        userId={user?.id}
        userEmail={user?.email}
      />
    </>
  );
}

export function BookingCalendarContainer(props: BookingCalendarContainerProps) {
  const { canReadOthersBookings } = props.permissions;
  const { userIds } = useBookingFilters();
  const { currentWeekStart } = useCurrentWeekStart();
  const [activeFilters, setActiveFilters] = useQueryState("activeFilters", activeFiltersParser);

  const allowedFilterIds = useAllowedFilters({ canReadOthersBookings, activeFilters, setActiveFilters });

  const query = trpc.viewer.bookings.get.useInfiniteQuery(
    {
      limit: 100, // Use max limit for calendar view
      filters: {
        statuses: STATUSES,
        userIds,
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
      <BookingCalendarInner
        {...props}
        data={data}
        allowedFilterIds={allowedFilterIds}
        isPending={query.isPending}
        hasError={!!query.error}
        errorMessage={query.error?.message}
      />
    </BookingDetailsSheetStoreProvider>
  );
}
