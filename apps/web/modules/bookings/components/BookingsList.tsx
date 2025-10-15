"use client";

import type { Table as ReactTable } from "@tanstack/react-table";
import type { RefObject } from "react";
import { useMemo } from "react";

import { DataTableWrapper, DataTableFilters, DataTableSegment } from "@calcom/features/data-table";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Alert } from "@calcom/ui/components/alert";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { WipeMyCalActionButton } from "@calcom/web/components/apps/wipemycalother/wipeMyCalActionButton";

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
  tableContainerRef: RefObject<HTMLDivElement>;
  bookingsToday: RowData[];
};

export function BookingsList({
  status,
  permissions: _permissions,
  query,
  table,
  tableContainerRef,
  bookingsToday,
}: BookingsListViewProps) {
  const { t } = useLocale();

  const isEmpty = useMemo(() => !query.data?.bookings.length, [query.data]);

  return (
    <>
      {query.status === "error" && (
        <Alert severity="error" title={t("something_went_wrong")} message={query.error.message} />
      )}
      {query.status !== "error" && (
        <>
          {!!bookingsToday.length && status === "upcoming" && (
            <WipeMyCalActionButton bookingStatus={status} bookingsEmpty={isEmpty} />
          )}
          <DataTableWrapper
            className="mb-6"
            tableContainerRef={tableContainerRef}
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
        </>
      )}
    </>
  );
}
