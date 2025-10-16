"use client";

import type { Table as ReactTable } from "@tanstack/react-table";

import { DataTableWrapper, DataTableFilters, DataTableSegment } from "@calcom/features/data-table";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";

import SkeletonLoader from "@components/booking/SkeletonLoader";

import type { validStatuses } from "~/bookings/lib/validStatuses";

import type { RowData } from "../views/bookings-view";

type BookingListingStatus = (typeof validStatuses)[number];

const descriptionByStatus: Record<BookingListingStatus, string> = {
  upcoming: "upcoming_bookings",
  recurring: "recurring_bookings",
  past: "past_bookings",
  cancelled: "cancelled_bookings",
  unconfirmed: "unconfirmed_bookings",
};

type BookingsListViewProps = {
  status: BookingListingStatus;
  permissions: {
    canReadOthersBookings: boolean;
  };
  query: ReturnType<typeof import("@calcom/trpc/react").trpc.viewer.bookings.get.useQuery>;
  table: ReactTable<RowData>;
};

export function BookingsList({ status, permissions: _permissions, query, table }: BookingsListViewProps) {
  const { t } = useLocale();

  return (
    <DataTableWrapper
      className="mb-6"
      table={table}
      testId={`${status}-bookings`}
      bodyTestId="bookings"
      headerClassName="hidden"
      isPending={query.isPending}
      totalRowCount={query.data?.totalCount}
      variant="compact"
      paginationMode="standard"
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
