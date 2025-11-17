"use client";

import dynamic from "next/dynamic";
import { useSearchParams, usePathname } from "next/navigation";
import { useQueryState } from "nuqs";
import { useMemo } from "react";

import dayjs from "@calcom/dayjs";
import {
  DataTableProvider,
  type SystemFilterSegment,
  useDataTable,
  ColumnFilterType,
  useFilterValue,
  ZMultiSelectFilterValue,
  ZDateRangeFilterValue,
  ZTextFilterValue,
} from "@calcom/features/data-table";
import { useSegments } from "@calcom/features/data-table/hooks/useSegments";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Alert } from "@calcom/ui/components/alert";
import type { HorizontalTabItemProps } from "@calcom/ui/components/navigation";
import { HorizontalTabs } from "@calcom/ui/components/navigation";
import { WipeMyCalActionButton } from "@calcom/web/components/apps/wipemycalother/wipeMyCalActionButton";

import { BookingsListContainer } from "../components/BookingsListContainer";
import { ViewToggleButton } from "../components/ViewToggleButton";
import type { validStatuses } from "../lib/validStatuses";
import { viewParser } from "../lib/viewParser";

const BookingsCalendarContainer = dynamic(() =>
  import("../components/BookingsCalendarContainer").then((mod) => ({
    default: mod.BookingsCalendarContainer,
  }))
);

type BookingsProps = {
  status: (typeof validStatuses)[number];
  userId?: number;
  permissions: {
    canReadOthersBookings: boolean;
  };
  bookingsV3Enabled: boolean;
};

function useSystemSegments(userId?: number) {
  const { t } = useLocale();

  const systemSegments: SystemFilterSegment[] = useMemo(() => {
    if (!userId) return [];

    return [
      {
        id: "my_bookings",
        name: t("my_bookings"),
        type: "system",
        activeFilters: [
          {
            f: "userId",
            v: {
              type: ColumnFilterType.MULTI_SELECT,
              data: [userId],
            },
          },
        ],
        perPage: 10,
      },
    ];
  }, [userId, t]);

  return systemSegments;
}

export default function Bookings(props: BookingsProps) {
  const pathname = usePathname();
  const systemSegments = useSystemSegments(props.userId);
  if (!pathname) return null;
  return (
    <DataTableProvider tableIdentifier={pathname} useSegments={useSegments} systemSegments={systemSegments}>
      <BookingsContent {...props} />
    </DataTableProvider>
  );
}

function BookingsContent({ status, permissions, bookingsV3Enabled }: BookingsProps) {
  const [_view] = useQueryState("view", viewParser.withDefault("list"));
  // Force view to be "list" if calendar view is disabled
  const view = bookingsV3Enabled ? _view : "list";
  const { t } = useLocale();
  const searchParams = useSearchParams();

  const tabs: HorizontalTabItemProps[] = useMemo(() => {
    const queryString = searchParams?.toString() || "";

    const baseTabConfigs = [
      {
        name: "upcoming",
        path: "/bookings/upcoming",
        "data-testid": "upcoming",
      },
      {
        name: "unconfirmed",
        path: "/bookings/unconfirmed",
        "data-testid": "unconfirmed",
      },
      {
        name: "recurring",
        path: "/bookings/recurring",
        "data-testid": "recurring",
      },
      {
        name: "past",
        path: "/bookings/past",
        "data-testid": "past",
      },
      {
        name: "cancelled",
        path: "/bookings/cancelled",
        "data-testid": "cancelled",
      },
    ];

    return baseTabConfigs.map((tabConfig) => ({
      name: tabConfig.name,
      href: queryString ? `${tabConfig.path}?${queryString}` : tabConfig.path,
      "data-testid": tabConfig["data-testid"],
    }));
  }, [searchParams]);

  const eventTypeIds = useFilterValue("eventTypeId", ZMultiSelectFilterValue)?.data as number[] | undefined;
  const teamIds = useFilterValue("teamId", ZMultiSelectFilterValue)?.data as number[] | undefined;
  const userIds = useFilterValue("userId", ZMultiSelectFilterValue)?.data as number[] | undefined;
  const dateRange = useFilterValue("dateRange", ZDateRangeFilterValue)?.data;
  const attendeeName = useFilterValue("attendeeName", ZTextFilterValue);
  const attendeeEmail = useFilterValue("attendeeEmail", ZTextFilterValue);
  const bookingUid = useFilterValue("bookingUid", ZTextFilterValue)?.data?.operand as string | undefined;

  const { limit, offset } = useDataTable();

  // Only apply pagination for list view, calendar view needs all bookings
  const shouldPaginate = view === "list";
  const queryLimit = shouldPaginate ? limit : 100; // Use max limit for calendar view
  const queryOffset = shouldPaginate ? offset : 0; // Reset offset for calendar view

  const query = trpc.viewer.bookings.get.useQuery(
    {
      limit: queryLimit,
      offset: queryOffset,
      filters: {
        status,
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

  const isEmpty = useMemo(() => !query.data?.bookings.length, [query.data]);
  const isPending = query.isPending;
  const totalRowCount = query.data?.totalCount;
  const hasError = !!query.error;

  const errorView = query.error ? (
    <Alert severity="error" title={t("something_went_wrong")} message={query.error.message} />
  ) : undefined;

  return (
    <div className="flex flex-col">
      <div className="flex flex-row flex-wrap justify-between">
        <HorizontalTabs
          tabs={tabs.map((tab) => ({
            ...tab,
            name: t(tab.name),
          }))}
        />

        <ViewToggleButton />
      </div>
      <main className="w-full">
        <div className="flex w-full flex-col">
          {status === "upcoming" && !isEmpty && (
            <WipeMyCalActionButton bookingStatus={status} bookingsEmpty={isEmpty} />
          )}
          {view === "list" && (
            <BookingsListContainer
              status={status}
              permissions={permissions}
              data={query.data}
              isPending={isPending}
              totalRowCount={totalRowCount}
              enableDetailsSheet={bookingsV3Enabled}
              ErrorView={errorView}
              hasError={hasError}
            />
          )}
          {bookingsV3Enabled && view === "calendar" && (
            <BookingsCalendarContainer
              status={status}
              permissions={permissions}
              data={query.data}
              isPending={isPending}
              ErrorView={errorView}
              hasError={hasError}
            />
          )}
        </div>
      </main>
    </div>
  );
}
