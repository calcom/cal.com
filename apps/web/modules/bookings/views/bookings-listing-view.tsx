"use client";

import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  createColumnHelper,
} from "@tanstack/react-table";
// eslint-disable-next-line no-restricted-imports
import { debounce } from "lodash";
import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import type { z } from "zod";

import { WipeMyCalActionButton } from "@calcom/app-store/wipemycalother/components";
import dayjs from "@calcom/dayjs";
import { FilterToggle } from "@calcom/features/bookings/components/FilterToggle";
import { FiltersContainer } from "@calcom/features/bookings/components/FiltersContainer";
import type { filterQuerySchema } from "@calcom/features/bookings/lib/useFilterQuery";
import { useFilterQuery } from "@calcom/features/bookings/lib/useFilterQuery";
import { DataTableProvider, DataTableWrapper } from "@calcom/features/data-table";
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
    "data-testid": "upcoming",
  },
  {
    name: "unconfirmed",
    href: "/bookings/unconfirmed",
    "data-testid": "unconfirmed",
  },
  {
    name: "recurring",
    href: "/bookings/recurring",
    "data-testid": "recurring",
  },
  {
    name: "past",
    href: "/bookings/past",
    "data-testid": "past",
  },
  {
    name: "cancelled",
    href: "/bookings/cancelled",
    "data-testid": "cancelled",
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
      isToday: boolean;
      recurringInfo?: RecurringInfo;
    }
  | {
      type: "today" | "next";
    };

function BookingsContent({ status }: BookingsProps) {
  const { data: filterQuery, pushItemToKey } = useFilterQuery();

  const { t } = useLocale();
  const user = useMeQuery().data;
  const [isFiltersVisible, setIsFiltersVisible] = useState<boolean>(false);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  useProperHeightForMobile(tableContainerRef);

  useEffect(() => {
    if (user?.isTeamAdminOrOwner && !filterQuery.userIds?.length) {
      setIsFiltersVisible(true);
      pushItemToKey("userIds", user?.id);
    }
  }, [user, filterQuery.status]);

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
            const { booking, recurringInfo, isToday } = props.row.original;
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

  const isEmpty = useMemo(() => !query.data?.pages[0]?.bookings.length, [query.data]);

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
          isToday: false,
        }))
      ) || []
    );
  }, [query.data]);

  const bookingsToday = useMemo<RowData[]>(() => {
    return (
      query.data?.pages.flatMap((page) =>
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
            isToday: true,
          }))
      ) || []
    );
  }, [query.data]);

  const finalData = useMemo<RowData[]>(() => {
    if (status !== "upcoming") {
      return flatData;
    }
    const merged: RowData[] = [];
    if (bookingsToday.length > 0) {
      merged.push({ type: "today" as const }, ...bookingsToday);
    }
    if (flatData.length > 0) {
      merged.push({ type: "next" as const }, ...flatData);
    }
    return merged;
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
        <HorizontalTabs
          tabs={tabs.map((tab) => ({
            ...tab,
            name: t(tab.name),
          }))}
        />
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
                tableContainerRef={tableContainerRef}
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

// Dynamically adjusts DataTable height on mobile to prevent nested scrolling
// and ensure the table fits within the viewport without overflowing (hacky)
function useProperHeightForMobile(ref: React.RefObject<HTMLDivElement>) {
  const lastOffsetY = useRef<number>();
  const lastWindowHeight = useRef<number>();
  const BOTTOM_NAV_HEIGHT = 64;
  const BUFFER = 32;

  const updateHeight = useCallback(
    debounce(() => {
      if (!ref.current || window.innerWidth >= 640) return;
      const rect = ref.current.getBoundingClientRect();
      if (rect.top !== lastOffsetY.current || window.innerHeight !== lastWindowHeight.current) {
        lastOffsetY.current = rect.top;
        lastWindowHeight.current = window.innerHeight;
        const height = window.innerHeight - lastOffsetY.current - BOTTOM_NAV_HEIGHT - BUFFER;
        ref.current.style.height = `${height}px`;
      }
    }, 200),
    [ref.current]
  );

  useEffect(() => {
    const handleResize = () => {
      updateHeight();
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [updateHeight]);

  updateHeight();
}
