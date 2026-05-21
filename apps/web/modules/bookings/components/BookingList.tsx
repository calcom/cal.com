"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { getI18nEditAttributes } from "@calcom/lib/i18nEditMode";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import SkeletonLoader from "@components/booking/SkeletonLoader";
import type { Table as ReactTable } from "@tanstack/react-table";
import { DataTableWrapper } from "~/data-table/components";
import type { BookingListingStatus, RowData } from "../types";

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
  const { t, i18n } = useLocale();
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const i18nEdit = (key: string) => getI18nEditAttributes(key, locale);
  const statusLabel = t(status).toLowerCase();

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
            headline={
              <span {...i18nEdit("no_status_bookings_yet")}>
                {t("no_status_bookings_yet", { status: statusLabel })}
              </span>
            }
            description={
              <span {...i18nEdit("no_status_bookings_yet_description")}>
                {t("no_status_bookings_yet_description", {
                  status: statusLabel,
                  description: t(descriptionByStatus[status]),
                })}
              </span>
            }
          />
        </div>
      }
      ErrorView={ErrorView}
      hasError={hasError}
    />
  );
}
