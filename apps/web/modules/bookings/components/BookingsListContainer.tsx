"use client";

import { useReactTable, getCoreRowModel, getSortedRowModel, createColumnHelper } from "@tanstack/react-table";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import React, { useState, useMemo, useEffect, useCallback } from "react";

import dayjs from "@calcom/dayjs";
import {
  ColumnFilterType,
  useDataTable,
  DataTableFilters,
  DataTableSegment,
  useDisplayedFilterCount,
} from "@calcom/features/data-table";
import { isSeparatorRow } from "@calcom/features/data-table/lib/separator";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import { Alert } from "@calcom/ui/components/alert";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { ToggleGroup } from "@calcom/ui/components/form";
import { WipeMyCalActionButton } from "@calcom/web/components/apps/wipemycalother/wipeMyCalActionButton";
import BookingListItem from "@calcom/web/components/booking/BookingListItem";

import { useBookingFilters } from "~/bookings/hooks/useBookingFilters";
import { useFacetedUniqueValues } from "~/bookings/hooks/useFacetedUniqueValues";

import {
  BookingDetailsSheetStoreProvider,
  useBookingDetailsSheetStore,
} from "../store/bookingDetailsSheetStore";
import type {
  RowData,
  BookingRowData,
  BookingListingStatus,
  BookingOutput,
  BookingsGetOutput,
} from "../types";
import { BookingDetailsSheet } from "./BookingDetailsSheet";
import { BookingsList } from "./BookingsList";
import { ViewToggleButton } from "./ViewToggleButton";

interface BookingsListContainerProps {
  status: BookingListingStatus;
  permissions: {
    canReadOthersBookings: boolean;
  };
  bookingsV3Enabled: boolean;
}

interface BookingsListInnerProps extends BookingsListContainerProps {
  data?: BookingsGetOutput;
  isPending: boolean;
  hasError: boolean;
  errorMessage?: string;
  totalRowCount?: number;
}

function BookingsListInner({
  status,
  permissions,
  bookingsV3Enabled,
  data,
  isPending,
  hasError,
  errorMessage,
  totalRowCount,
}: BookingsListInnerProps) {
  const { t } = useLocale();
  const user = useMeQuery().data;
  const setSelectedBookingUid = useBookingDetailsSheetStore((state) => state.setSelectedBookingUid);
  const router = useRouter();
  const [showFilters, setShowFilters] = useState(true);

  const ErrorView = errorMessage ? (
    <Alert severity="error" title={t("something_went_wrong")} message={errorMessage} />
  ) : undefined;

  const handleBookingClick = useCallback(
    (bookingUid: string) => {
      setSelectedBookingUid(bookingUid);
    },
    [setSelectedBookingUid]
  );

  // Define table columns for filtering (hidden columns used for filter UI)
  const columns = useMemo(() => {
    const columnHelper = createColumnHelper<RowData>();

    return [
      columnHelper.accessor((row) => !isSeparatorRow(row) && row.booking.eventType.id, {
        id: "eventTypeId",
        header: t("event_type"),
        enableColumnFilter: true,
        enableSorting: false,
        cell: () => null,
        meta: {
          filter: {
            type: ColumnFilterType.MULTI_SELECT,
          },
        },
      }),
      columnHelper.accessor((row) => !isSeparatorRow(row) && row.booking.eventType.team?.id, {
        id: "teamId",
        header: t("team"),
        enableColumnFilter: true,
        enableSorting: false,
        cell: () => null,
        meta: {
          filter: {
            type: ColumnFilterType.MULTI_SELECT,
          },
        },
      }),
      columnHelper.accessor((row) => !isSeparatorRow(row) && row.booking.user?.id, {
        id: "userId",
        header: t("member"),
        enableColumnFilter: permissions.canReadOthersBookings,
        enableSorting: false,
        cell: () => null,
        meta: {
          filter: {
            type: ColumnFilterType.MULTI_SELECT,
          },
        },
      }),
      columnHelper.accessor((row) => row, {
        id: "attendeeName",
        header: t("attendee_name"),
        enableColumnFilter: true,
        enableSorting: false,
        cell: () => null,
        meta: {
          filter: {
            type: ColumnFilterType.TEXT,
          },
        },
      }),
      columnHelper.accessor((row) => row, {
        id: "attendeeEmail",
        header: t("attendee_email_variable"),
        enableColumnFilter: true,
        enableSorting: false,
        cell: () => null,
        meta: {
          filter: {
            type: ColumnFilterType.TEXT,
          },
        },
      }),
      columnHelper.accessor((row) => row, {
        id: "dateRange",
        header: t("date_range"),
        enableColumnFilter: true,
        enableSorting: false,
        cell: () => null,
        meta: {
          filter: {
            type: ColumnFilterType.DATE_RANGE,
            dateRangeOptions: {
              range: status === "past" ? "past" : "custom",
            },
          },
        },
      }),
      columnHelper.accessor((row) => !isSeparatorRow(row) && row.booking.uid, {
        id: "bookingUid",
        header: t("booking_uid"),
        enableColumnFilter: true,
        enableSorting: false,
        cell: () => null,
        meta: {
          filter: {
            type: ColumnFilterType.TEXT,
            textOptions: {
              allowedOperators: ["equals"],
            },
          },
        },
      }),
      columnHelper.display({
        id: "customView",
        cell: (props) => {
          const row = props.row.original;

          // Separator rows are handled automatically by DataTable
          if (isSeparatorRow(row)) {
            return null;
          }

          const { booking, recurringInfo, isToday } = row;
          return (
            <BookingListItem
              key={booking.id}
              isToday={isToday}
              loggedInUser={{
                userId: user?.id,
                userTimeZone: user?.timeZone,
                userTimeFormat: user?.timeFormat,
                userEmail: user?.email,
              }}
              listingStatus={status}
              recurringInfo={recurringInfo}
              {...(bookingsV3Enabled && { onClick: () => handleBookingClick(booking.uid) })}
              {...booking}
            />
          );
        },
      }),
    ];
  }, [user, status, t, permissions.canReadOthersBookings, bookingsV3Enabled, handleBookingClick]);

  /**
   * Transform raw bookings into flat list (excluding today's bookings for "upcoming" status)
   * - Deduplicates recurring bookings for recurring/unconfirmed/cancelled tabs
   * - For "upcoming" status, filters out today's bookings (they're shown in separate "Today" section)
   */
  const flatData = useMemo<BookingRowData[]>(() => {
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
      } else if (status === "upcoming") {
        // For "upcoming" tab, exclude today's bookings (they're shown separately in the "Today" section)
        return (
          dayjs(booking.startTime).tz(user?.timeZone).format("YYYY-MM-DD") !==
          dayjs().tz(user?.timeZone).format("YYYY-MM-DD")
        );
      }
      return true;
    };

    return (
      data?.bookings.filter(filterBookings).map((booking) => ({
        type: "data" as const,
        booking,
        recurringInfo: data?.recurringInfo.find((info) => info.recurringEventId === booking.recurringEventId),
        isToday: false,
      })) || []
    );
  }, [data, status, user?.timeZone]);

  // Extract today's bookings for the "Today" section (only used in "upcoming" status)
  const bookingsToday = useMemo<BookingRowData[]>(() => {
    return (data?.bookings ?? [])
      .filter(
        (booking: BookingOutput) =>
          dayjs(booking.startTime).tz(user?.timeZone).format("YYYY-MM-DD") ===
          dayjs().tz(user?.timeZone).format("YYYY-MM-DD")
      )
      .map((booking) => ({
        type: "data" as const,
        booking,
        recurringInfo: data?.recurringInfo.find((info) => info.recurringEventId === booking.recurringEventId),
        isToday: true,
      }));
  }, [data, user?.timeZone]);

  // Combine data with section separators for "upcoming" tab
  const finalData = useMemo<RowData[]>(() => {
    // For other statuses, just return the flat list
    if (status !== "upcoming") {
      return flatData;
    }

    // For "upcoming" status, organize into "Today" and "Next" sections
    const merged: RowData[] = [];
    if (bookingsToday.length > 0) {
      merged.push({ type: "separator" as const, label: t("today") }, ...bookingsToday);
    }
    if (flatData.length > 0) {
      merged.push({ type: "separator" as const, label: t("next") }, ...flatData);
    }
    return merged;
  }, [bookingsToday, flatData, status, t]);

  const getFacetedUniqueValues = useFacetedUniqueValues();

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
      <div className="flex flex-row flex-wrap justify-between">
        <div className="flex items-center gap-2">
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
          {displayedFilterCount === 0 && <DataTableFilters.AddFilterButton table={table} />}
          {displayedFilterCount > 0 && (
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
          )}
        </div>
        <div className="flex items-center gap-2">
          <DataTableSegment.Select shortLabel />
          {bookingsV3Enabled && <ViewToggleButton />}
        </div>
      </div>
      {displayedFilterCount > 0 && showFilters && (
        <div className="mt-3 flex justify-between gap-2">
          <div className="flex gap-2">
            <DataTableFilters.ActiveFilters table={table} />
            <DataTableFilters.AddFilterButton table={table} variant="minimal" />
          </div>
          <div className="flex gap-2">
            <DataTableFilters.ClearFiltersButton />
            <DataTableSegment.SaveButton />
          </div>
        </div>
      )}
      {status === "upcoming" && !isEmpty && (
        <WipeMyCalActionButton className="mt-4" bookingStatus={status} bookingsEmpty={isEmpty} />
      )}
      <div className="mt-4">
        <BookingsList
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
        />
      )}
    </>
  );
}

export function BookingsListContainer(props: BookingsListContainerProps) {
  const { limit, offset } = useDataTable();
  const { eventTypeIds, teamIds, userIds, dateRange, attendeeName, attendeeEmail, bookingUid } =
    useBookingFilters();

  const query = trpc.viewer.bookings.get.useQuery(
    {
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
    },
    {
      staleTime: 5 * 60 * 1000, // 5 minutes - data is considered fresh
      gcTime: 30 * 60 * 1000, // 30 minutes - cache retention time
    }
  );

  const bookings = useMemo(() => query.data?.bookings ?? [], [query.data?.bookings]);

  return (
    <BookingDetailsSheetStoreProvider bookings={bookings}>
      <BookingsListInner
        {...props}
        data={query.data}
        isPending={query.isPending}
        hasError={!!query.error}
        errorMessage={query.error?.message}
        totalRowCount={query.data?.totalCount}
      />
    </BookingDetailsSheetStoreProvider>
  );
}

function useBookingStatusTab() {
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const tabOptions = useMemo(() => {
    const queryString = searchParams?.toString() || "";

    const baseTabConfigs = [
      {
        value: "upcoming",
        label: "upcoming",
        path: "/bookings/upcoming",
        dataTestId: "upcoming",
      },
      {
        value: "unconfirmed",
        label: "unconfirmed",
        path: "/bookings/unconfirmed",
        dataTestId: "unconfirmed",
      },
      {
        value: "recurring",
        label: "recurring",
        path: "/bookings/recurring",
        dataTestId: "recurring",
      },
      {
        value: "past",
        label: "past",
        path: "/bookings/past",
        dataTestId: "past",
      },
      {
        value: "cancelled",
        label: "cancelled",
        path: "/bookings/cancelled",
        dataTestId: "cancelled",
      },
    ];

    return baseTabConfigs.map((tabConfig) => ({
      value: tabConfig.value,
      label: t(tabConfig.label),
      dataTestId: tabConfig.dataTestId,
      href: queryString ? `${tabConfig.path}?${queryString}` : tabConfig.path,
    }));
  }, [searchParams, t]);

  const currentTab = useMemo(() => {
    const pathMatch = pathname?.match(/\/bookings\/(\w+)/);
    return pathMatch?.[1] || "upcoming";
  }, [pathname]);

  return {
    currentTab,
    tabOptions,
  };
}
