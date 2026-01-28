"use client";

import dayjs from "@calcom/dayjs";
import { useDataTable, useDisplayedFilterCount } from "@calcom/features/data-table";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import { Alert } from "@calcom/ui/components/alert";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { ToggleGroup } from "@calcom/ui/components/form";
import { WipeMyCalActionButton } from "@calcom/web/components/apps/wipemycalother/wipeMyCalActionButton";
import { getCoreRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useBookingFilters } from "~/bookings/hooks/useBookingFilters";
import { useBookingListColumns } from "~/bookings/hooks/useBookingListColumns";
import { useBookingListData } from "~/bookings/hooks/useBookingListData";
import { useBookingStatusTab } from "~/bookings/hooks/useBookingStatusTab";
import { useFacetedUniqueValues } from "~/bookings/hooks/useFacetedUniqueValues";
import { useListAutoSelector } from "~/bookings/hooks/useListAutoSelector";
import { DataTableFilters, DataTableSegment } from "~/data-table/components";
import {
  BookingDetailsSheetStoreProvider,
  useBookingDetailsSheetStore,
} from "../store/bookingDetailsSheetStore";
import type { BookingListingStatus, BookingsGetOutput, RowData } from "../types";
import { BookingDetailsSheet } from "./BookingDetailsSheet";
import { BookingList } from "./BookingList";
import { ViewToggleButton } from "./ViewToggleButton";

interface FilterButtonProps {
  table: ReturnType<typeof useReactTable<RowData>>;
  displayedFilterCount: number;
  setShowFilters: (value: boolean | ((prev: boolean) => boolean)) => void;
}

function FilterButton({ table, displayedFilterCount, setShowFilters }: FilterButtonProps) {
  const { t } = useLocale();

  if (displayedFilterCount === 0) {
    return <DataTableFilters.AddFilterButton table={table} />;
  }

  return (
    <Button
      color="secondary"
      StartIcon="list-filter"
      className="h-full"
      size="sm"
      onClick={() => setShowFilters((value) => !value)}>
      {t("filter")}
      <Badge variant="gray" className="ml-1">
        {displayedFilterCount}
      </Badge>
    </Button>
  );
}

interface BookingListContainerProps {
  status: BookingListingStatus;
  permissions: {
    canReadOthersBookings: boolean;
  };
  bookingsV3Enabled: boolean;
  bookingAuditEnabled: boolean;
}

interface BookingListInnerProps extends BookingListContainerProps {
  data?: BookingsGetOutput;
  isPending: boolean;
  hasError: boolean;
  errorMessage?: string;
  totalRowCount?: number;
  bookings: BookingsGetOutput["bookings"];
}

function BookingListInner({
  status,
  permissions,
  bookings,
  bookingsV3Enabled,
  bookingAuditEnabled,
  data,
  isPending,
  hasError,
  errorMessage,
  totalRowCount,
}: BookingListInnerProps) {
  const { t } = useLocale();
  const user = useMeQuery().data;
  const setSelectedBookingUid = useBookingDetailsSheetStore((state) => state.setSelectedBookingUid);
  const router = useRouter();
  const [showFilters, setShowFilters] = useState(true);

  // Handle auto-selection for list view
  useListAutoSelector(bookings);

  const ErrorView = errorMessage ? (
    <Alert severity="error" title={t("something_went_wrong")} message={errorMessage} />
  ) : undefined;

  const handleBookingClick = useCallback(
    (bookingUid: string) => {
      setSelectedBookingUid(bookingUid);
    },
    [setSelectedBookingUid]
  );

  const columns = useBookingListColumns({
    user,
    status,
    canReadOthersBookings: permissions.canReadOthersBookings,
    bookingsV3Enabled,
    handleBookingClick,
  });

  const finalData = useBookingListData({
    data,
    status,
    userTimeZone: user?.timeZone,
  });

  const getFacetedUniqueValues = useFacetedUniqueValues({
    canReadOthersBookings: permissions.canReadOthersBookings,
  });

  const displayedFilterCount = useDisplayedFilterCount();
  const { currentTab, tabOptions } = useBookingStatusTab();

  useEffect(() => {
    if (displayedFilterCount === 0) {
      // reset to true, so it shows filters as soon as any filter is applied
      setShowFilters(true);
    }
  }, [displayedFilterCount]);

  const table = useReactTable<RowData>({
    data: finalData,
    columns,
    initialState: {
      columnVisibility: {
        eventTypeId: false,
        teamId: false,
        userId: false,
        attendeeName: false,
        attendeeEmail: false,
        dateRange: false,
        bookingUid: false,
      },
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedUniqueValues,
  });

  const isEmpty = !data?.bookings || data.bookings.length === 0;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {/* Desktop: full width on first row, Mobile: full width on first row with horizontal scroll */}
        <div className="w-full md:w-auto">
          <div className="overflow-x-auto md:overflow-visible">
            <ToggleGroup
              value={currentTab}
              onValueChange={(value) => {
                if (!value) return;
                const selectedTab = tabOptions.find((tab) => tab.value === value);
                if (selectedTab?.href) {
                  router.push(selectedTab.href);
                }
              }}
              options={tabOptions}
            />
          </div>
        </div>

        {/* Desktop: second item on first row, Mobile: first item on second row */}
        <FilterButton
          table={table}
          displayedFilterCount={displayedFilterCount}
          setShowFilters={setShowFilters}
        />

        {/* Desktop: auto-pushed to right via flex-grow spacer, Mobile: continue on second row */}
        <div className="hidden grow md:block" />

        <DataTableSegment.Select />
        {/* <BookingsCsvDownload status={status} /> */}
        {bookingsV3Enabled && <ViewToggleButton bookingsV3Enabled={bookingsV3Enabled} />}
      </div>
      {displayedFilterCount > 0 && showFilters && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <DataTableFilters.ActiveFilters table={table} />
          <DataTableFilters.AddFilterButton table={table} variant="minimal" />

          {/* Desktop: auto-pushed to right via flex-grow spacer */}
          <div className="hidden flex-grow md:block" />

          <DataTableFilters.ClearFiltersButton />
          <DataTableSegment.SaveButton />
        </div>
      )}
      {status === "upcoming" && !isEmpty && (
        <WipeMyCalActionButton className="mt-4" bookingStatus={status} bookingsEmpty={isEmpty} />
      )}
      <div className="mt-4">
        <BookingList
          status={status}
          table={table}
          isPending={isPending}
          totalRowCount={totalRowCount}
          ErrorView={ErrorView}
          hasError={hasError}
        />
      </div>

      {bookingsV3Enabled && (
        <BookingDetailsSheet
          userTimeZone={user?.timeZone}
          userTimeFormat={user?.timeFormat === null ? undefined : user?.timeFormat}
          userId={user?.id}
          userEmail={user?.email}
          bookingAuditEnabled={bookingAuditEnabled}
        />
      )}
    </>
  );
}

export function BookingListContainer(props: BookingListContainerProps) {
  const { limit, offset, setPageIndex } = useDataTable();
  const { eventTypeIds, teamIds, userIds, dateRange, attendeeName, attendeeEmail, bookingUid } =
    useBookingFilters();

  // Build query input once - shared between query and prefetching
  const queryInput = useMemo(
    () => ({
      limit,
      offset,
      filters: {
        statuses: [props.status],
        eventTypeIds,
        teamIds,
        userIds,
        attendeeName,
        attendeeEmail,
        bookingUid,
        afterStartDate: dateRange?.startDate
          ? dayjs(dateRange?.startDate).startOf("day").toISOString()
          : undefined,
        beforeEndDate: dateRange?.endDate ? dayjs(dateRange?.endDate).endOf("day").toISOString() : undefined,
      },
    }),
    [
      limit,
      offset,
      props.status,
      eventTypeIds,
      teamIds,
      userIds,
      attendeeName,
      attendeeEmail,
      bookingUid,
      dateRange,
    ]
  );

  const query = trpc.viewer.bookings.get.useQuery(queryInput, {
    staleTime: 5 * 60 * 1000, // 5 minutes - data is considered fresh
    gcTime: 30 * 60 * 1000, // 30 minutes - cache retention time
  });

  const bookings = useMemo(() => query.data?.bookings ?? [], [query.data?.bookings]);

  // Always call the hook and provide navigation capabilities
  // The BookingDetailsSheet is only rendered when bookingsV3Enabled is true (see line 212)
  // const capabilities = useListNavigationCapabilities({
  //   limit,
  //   offset,
  //   totalCount: query.data?.totalCount,
  //   setPageIndex,
  //   queryInput,
  // });

  return (
    <BookingDetailsSheetStoreProvider bookings={bookings}>
      <BookingListInner
        {...props}
        data={query.data}
        isPending={query.isPending}
        hasError={!!query.error}
        errorMessage={query.error?.message}
        totalRowCount={query.data?.totalCount}
        bookings={bookings}
      />
    </BookingDetailsSheetStoreProvider>
  );
}
