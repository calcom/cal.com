"use client";

import { useReactTable, getCoreRowModel, getSortedRowModel } from "@tanstack/react-table";
import { useQueryState } from "nuqs";
import React, { useMemo, useEffect } from "react";

import dayjs from "@calcom/dayjs";
import { DataTableFilters } from "@calcom/features/data-table";
import { activeFiltersParser } from "@calcom/features/data-table/lib/parsers";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import { Alert } from "@calcom/ui/components/alert";

import { useBookingCalendarData } from "~/bookings/hooks/useBookingCalendarData";
import { useBookingFilters } from "~/bookings/hooks/useBookingFilters";
import { useCalendarAllowedFilters } from "~/bookings/hooks/useCalendarAllowedFilters";
import { useCurrentWeekStart } from "~/bookings/hooks/useCurrentWeekStart";
import { useFacetedUniqueValues } from "~/bookings/hooks/useFacetedUniqueValues";

import { buildFilterColumns, getFilterColumnVisibility } from "../columns/filterColumns";
import { BookingDetailsSheetStoreProvider } from "../store/bookingDetailsSheetStore";
import type { RowData, BookingListingStatus, BookingsGetOutput } from "../types";
import { BookingCalendarView } from "./BookingCalendarView";
import { BookingDetailsSheet } from "./BookingDetailsSheet";
import { ViewToggleButton } from "./ViewToggleButton";

// For calendar view, fetch all statuses except cancelled
const STATUSES: BookingListingStatus[] = ["upcoming", "unconfirmed", "recurring", "past"];

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

  const rowData = useBookingCalendarData({ data, status });

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

  const allowedFilterIds = useCalendarAllowedFilters({
    canReadOthersBookings,
    activeFilters,
    setActiveFilters,
  });

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
