"use client";

import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  createColumnHelper,
} from "@tanstack/react-table";
import type { ReactElement } from "react";
import { Fragment, useMemo, useState } from "react";
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

export const BOOKING_LIST_LIMIT = 10;

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

type RowData = {
  booking: BookingOutput;
  recurringInfo?: RecurringInfo;
};

function BookingsContent({ status }: BookingsProps) {
  const { data: filterQuery } = useFilterQuery();

  const { t } = useLocale();
  const user = useMeQuery().data;
  const [isFiltersVisible, setIsFiltersVisible] = useState<boolean>(false);

  const bookingListFilters = useMemo(() => {
    return {
      ...filterQuery,
      status: filterQuery.status ?? status,
    };
  }, [status, filterQuery]);

  const query = trpc.viewer.bookings.get.useInfiniteQuery(
    {
      limit: BOOKING_LIST_LIMIT,
      filters: bookingListFilters,
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
              bookingListFilters={bookingListFilters}
              {...booking}
            />
          );
        },
      }),
    ];
  }, [user, status, bookingListFilters]);

  const isEmpty = !query.data?.pages[0]?.bookings.length;

  const flatData = useMemo(() => {
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
          booking,
          recurringInfo: page.recurringInfo.find(
            (info) => info.recurringEventId === booking.recurringEventId
          ),
        }))
      ) || []
    );
  }, [query.data, status, user]);

  const table = useReactTable<RowData>({
    data: flatData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  let recurringInfoToday: RecurringInfo | undefined;

  const bookingsToday =
    query.data?.pages.map((page) =>
      page.bookings.filter((booking: BookingOutput) => {
        recurringInfoToday = page.recurringInfo.find(
          (info) => info.recurringEventId === booking.recurringEventId
        );

        return (
          dayjs(booking.startTime).tz(user?.timeZone).format("YYYY-MM-DD") ===
          dayjs().tz(user?.timeZone).format("YYYY-MM-DD")
        );
      })
    )[0] || [];

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
                <div className="mb-6 pt-2 xl:pt-0">
                  <WipeMyCalActionButton bookingStatus={status} bookingsEmpty={isEmpty} />
                  <p className="text-subtle mb-2 text-xs font-medium uppercase leading-4">{t("today")}</p>
                  <div className="border-subtle overflow-hidden rounded-md border">
                    <div
                      className="bg-default divide-subtle w-full max-w-full divide-y"
                      data-testid="today-bookings">
                      <Fragment>
                        {bookingsToday.map((booking: BookingOutput) => (
                          <BookingListItem
                            key={booking.id}
                            loggedInUser={{
                              userId: user?.id,
                              userTimeZone: user?.timeZone,
                              userTimeFormat: user?.timeFormat,
                              userEmail: user?.email,
                            }}
                            listingStatus={status}
                            recurringInfo={recurringInfoToday}
                            bookingListFilters={bookingListFilters}
                            {...booking}
                          />
                        ))}
                      </Fragment>
                    </div>
                  </div>
                </div>
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
