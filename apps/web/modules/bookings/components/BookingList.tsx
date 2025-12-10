"use client";

import type { Table as ReactTable } from "@tanstack/react-table";

import { DataTableWrapper } from "@calcom/features/data-table";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";

import SkeletonLoader from "@components/booking/SkeletonLoader";

import type { RowData, BookingListingStatus } from "../types";

const descriptionByStatus: Record<BookingListingStatus, string> = {
  upcoming: "upcoming_bookings",
  recurring: "recurring_bookings",
  past: "past_bookings",
  cancelled: "cancelled_bookings",
  unconfirmed: "unconfirmed_bookings",
};

type BookingListViewProps = {
  status: BookingListingStatus;
  table: ReactTable<RowData>;
  isPending: boolean;
  totalRowCount?: number;
  ErrorView?: React.ReactNode;
  hasError?: boolean;
};

export function BookingList({
  status,
  table,
  isPending,
  totalRowCount,
  ErrorView,
  hasError,
}: BookingListViewProps) {
  const { t } = useLocale();

  return (
    <DataTableWrapper
      className="mb-6"
      table={table}
      testId={`${status}-bookings`}
      bodyTestId="bookings"
      headerClassName="hidden"
      isPending={isPending}
      totalRowCount={totalRowCount}
      variant="compact"
      paginationMode="standard"
      separatorClassName="py-4 pl-6 text-xs uppercase leading-4"
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
      ErrorView={ErrorView}
      hasError={hasError}
    />
  );
}
