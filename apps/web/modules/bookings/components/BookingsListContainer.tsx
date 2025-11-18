"use client";

import { useReactTable, getCoreRowModel, getSortedRowModel, createColumnHelper } from "@tanstack/react-table";
import { useMemo, useCallback } from "react";

import dayjs from "@calcom/dayjs";
import { ColumnFilterType } from "@calcom/features/data-table";
import { isSeparatorRow } from "@calcom/features/data-table/lib/separator";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import BookingListItem from "@calcom/web/components/booking/BookingListItem";

import { useFacetedUniqueValues } from "~/bookings/hooks/useFacetedUniqueValues";

import {
  BookingDetailsSheetStoreProvider,
  useBookingDetailsSheetStore,
} from "../store/bookingDetailsSheetStore";
import type {
  RowData,
  BookingRowData,
  BookingListingStatus,
  BookingsGetOutput,
  BookingOutput,
} from "../types";
import { BookingDetailsSheet } from "./BookingDetailsSheet";
import { BookingsList } from "./BookingsList";

interface BookingsListContainerProps {
  status: BookingListingStatus;
  permissions: {
    canReadOthersBookings: boolean;
  };
  data?: BookingsGetOutput;
  isPending: boolean;
  enableDetailsSheet: boolean;
  totalRowCount?: number;
  ErrorView?: React.ReactNode;
  hasError?: boolean;
}

function BookingsListInner({
  status,
  permissions,
  data,
  isPending,
  enableDetailsSheet,
  totalRowCount,
  ErrorView,
  hasError,
}: BookingsListContainerProps) {
  const { t } = useLocale();
  const user = useMeQuery().data;
  const setSelectedBookingUid = useBookingDetailsSheetStore((state) => state.setSelectedBookingUid);

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
              {...(enableDetailsSheet && { onClick: () => handleBookingClick(booking.uid) })}
              {...booking}
            />
          );
        },
      }),
    ];
  }, [user, status, t, permissions.canReadOthersBookings, enableDetailsSheet, handleBookingClick]);

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

  return (
    <>
      <BookingsList
        status={status}
        table={table}
        isPending={isPending}
        totalRowCount={totalRowCount}
        ErrorView={ErrorView}
        hasError={hasError}
      />

      {enableDetailsSheet && (
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

export function BookingsListContainer({
  status,
  permissions,
  data,
  isPending,
  enableDetailsSheet,
  totalRowCount,
  ErrorView,
  hasError,
}: BookingsListContainerProps) {
  // Extract bookings from data for BookingDetailsSheet
  const bookings = useMemo(() => data?.bookings ?? [], [data]);

  return (
    <BookingDetailsSheetStoreProvider bookings={bookings}>
      <BookingsListInner
        status={status}
        permissions={permissions}
        data={data}
        isPending={isPending}
        enableDetailsSheet={enableDetailsSheet}
        totalRowCount={totalRowCount}
        ErrorView={ErrorView}
        hasError={hasError}
      />
    </BookingDetailsSheetStoreProvider>
  );
}
