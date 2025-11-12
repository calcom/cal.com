"use client";

import type { Row, Table as ReactTable } from "@tanstack/react-table";
import { useCallback } from "react";

import { DataTableWrapper, DataTableFilters, DataTableSegment } from "@calcom/features/data-table";
import { isSeparatorRow } from "@calcom/features/data-table/lib/separator";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";

import SkeletonLoader from "@components/booking/SkeletonLoader";

import { useBookingDetailsSheetStore } from "../store/bookingDetailsSheetStore";
import type { RowData, BookingListingStatus } from "../types";

const descriptionByStatus: Record<BookingListingStatus, string> = {
  upcoming: "upcoming_bookings",
  recurring: "recurring_bookings",
  past: "past_bookings",
  cancelled: "cancelled_bookings",
  unconfirmed: "unconfirmed_bookings",
};

type BookingsListViewProps = {
  status: BookingListingStatus;
  table: ReactTable<RowData>;
  isPending: boolean;
  totalRowCount?: number;
};

export function BookingsList({ status, table, isPending, totalRowCount }: BookingsListViewProps) {
  const { t } = useLocale();
  const setSelectedBookingId = useBookingDetailsSheetStore((state) => state.setSelectedBookingId);

  const handleRowClick = useCallback(
    (row: Row<RowData>) => {
      if (!isSeparatorRow(row.original)) {
        setSelectedBookingId(row.original.booking.id);
      }
    },
    [setSelectedBookingId]
  );

  return (
    <DataTableWrapper
      className="mb-6"
      table={table}
      testId={`${status}-bookings`}
      bodyTestId="bookings"
      rowTestId={(row) => {
        if (isSeparatorRow(row.original)) return undefined;
        return "booking-item";
      }}
      rowDataAttributes={(row) => {
        if (isSeparatorRow(row.original)) return undefined;
        return {
          "data-today": String(row.original.isToday),
        };
      }}
      isPending={isPending}
      totalRowCount={totalRowCount}
      variant="default"
      paginationMode="standard"
      onRowMouseclick={handleRowClick}
      hideSeparatorsOnSort={true}
      ToolbarLeft={
        <>
          <DataTableFilters.FilterBar table={table} />
        </>
      }
      ToolbarRight={
        <>
          <DataTableFilters.ClearFiltersButton />
          <DataTableSegment.SaveButton />
          <DataTableSegment.Select />
        </>
      }
      LoaderView={<SkeletonLoader />}
      EmptyView={
        <div className="flex items-center justify-center pt-2 xl:pt-0">
          <EmptyScreen
            Icon="calendar"
            headline={t("no_status_bookings_yet", { status: t(status).toLowerCase() })}
            description={t("no_status_bookings_yet_description", {
              status: t(status).toLowerCase(),
              description: t(descriptionByStatus[status]),
            })}
          />
        </div>
      }
    />
  );
}
