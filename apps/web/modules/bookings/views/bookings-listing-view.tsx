"use client";

import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  createColumnHelper,
} from "@tanstack/react-table";
import type { ReactElement } from "react";
import { useMemo, useState } from "react";
import type { z } from "zod";

import { WipeMyCalActionButton } from "@calcom/app-store/wipemycalother/components";
import dayjs from "@calcom/dayjs";
import { FilterToggle } from "@calcom/features/bookings/components/FilterToggle";
import { FiltersContainer } from "@calcom/features/bookings/components/FiltersContainer";
import type { filterQuerySchema } from "@calcom/features/bookings/lib/useFilterQuery";
import { useFilterQuery } from "@calcom/features/bookings/lib/useFilterQuery";
import { DataTableProvider, DataTableWrapper } from "@calcom/features/data-table";
import Shell from "@calcom/features/shell/Shell";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import type { HorizontalTabItemProps, VerticalTabItemProps } from "@calcom/ui";
import { Alert, EmptyScreen, HorizontalTabs } from "@calcom/ui";

import useMeQuery from "@lib/hooks/useMeQuery";

import BookingListItem from "@components/booking/BookingListItem";
import SkeletonLoader from "@components/booking/SkeletonLoader";

import type { validStatuses } from "~/bookings/lib/validStatuses";

type BookingListingStatus = z.infer<NonNullable<typeof filterQuerySchema>>["status"];
type BookingOutput = RouterOutputs["viewer"]["bookings"]["get"]["bookings"][0];

type RecurringInfo = {
  recurringEventId: string | null;
  count: number;
  firstDate: Date | null;
  bookings: { [key: string]: Date[] };
};

const tabs: (VerticalTabItemProps | HorizontalTabItemProps)[] = [
  {
    name: "upcoming",
    href: "/bookings/upcoming",
  },
  {
    name: "unconfirmed",
    href: "/bookings/unconfirmed",
  },
  {
    name: "recurring",
    href: "/bookings/recurring",
  },
  {
    name: "past",
    href: "/bookings/past",
  },
  {
    name: "cancelled",
    href: "/bookings/cancelled",
  },
];

const descriptionByStatus: Record<NonNullable<BookingListingStatus>, string> = {
  upcoming: "upcoming_bookings",
  recurring: "recurring_bookings",
  past: "past_bookings",
  cancelled: "cancelled_bookings",
  unconfirmed: "unconfirmed_bookings",
};

type BookingsProps = {
  status: (typeof validStatuses)[number];
};

export default function Bookings(props: BookingsProps) {
  return (
    <DataTableProvider>
      <BookingsContent {...props} />
    </DataTableProvider>
  );
}

type RowData =
  | {
      type: "data";
      booking: BookingOutput;
      recurringInfo?: RecurringInfo;
    }
  | {
      type: "today" | "next";
    };

function BookingsContent({ status }: BookingsProps) {
  const { data: filterQuery } = useFilterQuery();

  const { t } = useLocale();
  const user = useMeQuery().data;
  const [isFiltersVisible, setIsFiltersVisible] = useState<boolean>(false);

  const query = trpc.viewer.bookings.get.useInfiniteQuery(
    {
      limit: 10,
      filters: {
        ...filterQuery,
        status: filterQuery.status ?? status,
      },
    },
    {
      enabled: true,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  const columns = useMemo(() => {
    const columnHelper = createColumnHelper<RowData>();

    return [
      columnHelper.display({
        id: "custom-view",
        cell: (props) => {
          if (props.row.original.type === "data") {
            const { booking, recurringInfo } = props.row.original;
            return (
              <BookingListItem
                key={booking.id}
                loggedInUser={{
                  userId: user?.id,
                  userTimeZone: user?.timeZone,
                  userTimeFormat: user?.timeFormat,
                  userEmail: user?.email,
                }}
                listingStatus={status}
                recurringInfo={recurringInfo}
                {...booking}
              />
            );
          } else if (props.row.original.type === "today") {
            return (
              <p className="text-subtle bg-subtle w-full py-4 pl-6 text-xs font-semibold uppercase leading-4">
                {t("today")}
              </p>
            );
          } else if (props.row.original.type === "next") {
            return (
              <p className="text-subtle bg-subtle w-full py-4 pl-6 text-xs font-semibold uppercase leading-4">
                {t("next")}
              </p>
            );
          }
        },
      }),
    ];
  }, [user, status]);

  const isEmpty = !query.data?.pages[0]?.bookings.length;

  const flatData = useMemo<RowData[]>(() => {
    const shownBookings: Record<string, BookingOutput[]> = {};
    const filterBookings = (booking: BookingOutput) => {
      if (status === "recurring" || status == "unconfirmed" || status === "cancelled") {
        if (!booking.recurringEventId) {
          return true;
        }
        if (
          shownBookings[booking.recurringEventId] !== undefined &&
          shownBookings[booking.recurringEventId].length > 0
        ) {
          shownBookings[booking.recurringEventId].push(booking);
          return false;
        }
        shownBookings[booking.recurringEventId] = [booking];
      } else if (status === "upcoming") {
        return (
          dayjs(booking.startTime).tz(user?.timeZone).format("YYYY-MM-DD") !==
          dayjs().tz(user?.timeZone).format("YYYY-MM-DD")
        );
      }
      return true;
    };

    return (
      query.data?.pages.flatMap((page) =>
        page.bookings.filter(filterBookings).map((booking) => ({
          type: "data",
          booking,
          recurringInfo: page.recurringInfo.find(
            (info) => info.recurringEventId === booking.recurringEventId
          ),
        }))
      ) || []
    );
  }, [query.data]);

  const bookingsToday = useMemo<RowData[]>(() => {
    return (
      query.data?.pages.map((page) =>
        page.bookings
          .filter(
            (booking: BookingOutput) =>
              dayjs(booking.startTime).tz(user?.timeZone).format("YYYY-MM-DD") ===
              dayjs().tz(user?.timeZone).format("YYYY-MM-DD")
          )
          .map((booking) => ({
            type: "data" as const,
            booking,
            recurringInfo: page.recurringInfo.find(
              (info) => info.recurringEventId === booking.recurringEventId
            ),
          }))
      )[0] || []
    );
  }, [query.data]);

  const finalData = useMemo<RowData[]>(() => {
    if (bookingsToday.length > 0 && status === "upcoming") {
      const merged: RowData[] = [
        { type: "today" as const },
        ...bookingsToday,
        { type: "next" as const },
        ...flatData,
      ];
      return merged;
    } else {
      return flatData;
    }
  }, [bookingsToday, flatData, status]);

  const table = useReactTable<RowData>({
    data: finalData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="flex flex-col">
      <div className="flex flex-row flex-wrap justify-between">
        <HorizontalTabs tabs={tabs} />
        <FilterToggle setIsFiltersVisible={setIsFiltersVisible} />
      </div>
      <FiltersContainer isFiltersVisible={isFiltersVisible} />
      <main className="w-full">
        <div className="flex w-full flex-col">
          {query.status === "error" && (
            <Alert severity="error" title={t("something_went_wrong")} message={query.error.message} />
          )}
          {(query.status === "pending" || query.isPaused) && <SkeletonLoader />}
          {query.status === "success" && !isEmpty && (
            <>
              {!!bookingsToday.length && status === "upcoming" && (
                <WipeMyCalActionButton bookingStatus={status} bookingsEmpty={isEmpty} />
              )}
              <DataTableWrapper
                table={table}
                testId={`${status}-bookings`}
                bodyTestId="bookings"
                hideHeader={true}
                isPending={query.isFetching && !flatData}
                hasNextPage={query.hasNextPage}
                fetchNextPage={query.fetchNextPage}
                isFetching={query.isFetching}
                variant="compact"
              />
            </>
          )}
          {query.status === "success" && isEmpty && (
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
          )}
        </div>
      </main>
    </div>
  );
}

function BookingsStatusLayout({ children }: { children: React.ReactNode }) {
  const { t } = useLocale();
  return (
    <Shell
      withoutMain={false}
      withoutSeo={true}
      hideHeadingOnMobile
      heading={t("bookings")}
      subtitle={t("bookings_description")}
      title={t("bookings")}
      description={t("bookings_description")}>
      {children}
    </Shell>
  );
}

export const getLayout = (page: ReactElement) => <BookingsStatusLayout>{page}</BookingsStatusLayout>;
