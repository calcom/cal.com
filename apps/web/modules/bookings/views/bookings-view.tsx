"use client";

import { useReactTable, getCoreRowModel, getSortedRowModel, createColumnHelper } from "@tanstack/react-table";
import { useSearchParams, usePathname } from "next/navigation";
import { createParser, useQueryState } from "nuqs";
import { useMemo } from "react";

import dayjs from "@calcom/dayjs";
import {
  DataTableProvider,
  DataTableFilters,
  DataTableSegment,
  type SystemFilterSegment,
  useDataTable,
  ColumnFilterType,
  useFilterValue,
  ZMultiSelectFilterValue,
  ZDateRangeFilterValue,
  ZTextFilterValue,
} from "@calcom/features/data-table";
import { useSegments } from "@calcom/features/data-table/hooks/useSegments";
import { isSeparatorRow } from "@calcom/features/data-table/lib/separator";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import { Alert } from "@calcom/ui/components/alert";
import { AvatarGroup } from "@calcom/ui/components/avatar";
import { Badge } from "@calcom/ui/components/badge";
import type { HorizontalTabItemProps } from "@calcom/ui/components/navigation";
import { HorizontalTabs } from "@calcom/ui/components/navigation";
import { WipeMyCalActionButton } from "@calcom/web/components/apps/wipemycalother/wipeMyCalActionButton";

import BookingListItem from "@components/booking/BookingListItem";

import { useFacetedUniqueValues } from "~/bookings/hooks/useFacetedUniqueValues";
import type { validStatuses } from "~/bookings/lib/validStatuses";

import { BookingDetailsSheet } from "../components/BookingDetailsSheet";
import { BookingsCalendar } from "../components/BookingsCalendar";
import { BookingsList } from "../components/BookingsList";
import { useBookingCursor } from "../hooks/useBookingCursor";
import type { RowData, BookingOutput } from "../types";

type BookingsProps = {
  status: (typeof validStatuses)[number];
  userId?: number;
  permissions: {
    canReadOthersBookings: boolean;
  };
  isCalendarViewEnabled: boolean;
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

const viewParser = createParser({
  parse: (value: string) => {
    if (value === "calendar") return "calendar";
    return "list";
  },
  serialize: (value: "list" | "calendar") => value,
});

function BookingsContent({ status, permissions, isCalendarViewEnabled }: BookingsProps) {
  const [_view] = useQueryState("view", viewParser.withDefault("list"));
  // Force view to be "list" if calendar view is disabled
  const view = isCalendarViewEnabled ? _view : "list";
  const { t } = useLocale();
  const user = useMeQuery().data;
  const searchParams = useSearchParams();
  const [selectedBookingId, setSelectedBookingId] = useQueryState("selectedId", {
    defaultValue: null,
    parse: (value) => (value ? parseInt(value, 10) : null),
    serialize: (value) => (value ? String(value) : ""),
    clearOnDefault: true,
  });

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

  const query = trpc.viewer.bookings.get.useQuery({
    limit,
    offset,
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
  });

  const columns = useMemo(() => {
    const columnHelper = createColumnHelper<RowData>();

    return [
      columnHelper.accessor((row) => row.type === "data" && row.booking.eventType.id, {
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
      columnHelper.accessor((row) => row.type === "data" && row.booking.eventType.team?.id, {
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
      columnHelper.accessor((row) => row.type === "data" && row.booking.user?.id, {
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
      columnHelper.accessor((row) => row.type === "data" && row.booking.uid, {
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
        id: "date",
        header: () => <span className="text-subtle text-sm font-medium">{t("date")}</span>,
        cell: (props) => {
          const row = props.row.original;
          if (isSeparatorRow(row)) return null;

          return (
            <div className="text-default text-sm font-medium">
              {dayjs(row.booking.startTime).tz(user?.timeZone).format("ddd, DD MMM")}
            </div>
          );
        },
      }),
      columnHelper.display({
        id: "time",
        header: () => <span className="text-subtle text-sm font-medium">{t("time")}</span>,
        cell: (props) => {
          const row = props.row.original;
          if (isSeparatorRow(row)) return null;

          const startTime = dayjs(row.booking.startTime).tz(user?.timeZone);
          const endTime = dayjs(row.booking.endTime).tz(user?.timeZone);
          return (
            <div className="text-default text-sm font-medium">
              {startTime.format(user?.timeFormat === 12 ? "h:mma" : "HH:mm")} -{" "}
              {endTime.format(user?.timeFormat === 12 ? "h:mma" : "HH:mm")}
            </div>
          );
        },
      }),
      columnHelper.display({
        id: "event",
        header: () => <span className="text-subtle text-sm font-medium">{t("event")}</span>,
        cell: (props) => {
          const row = props.row.original;
          if (isSeparatorRow(row)) return null;

          return <div className="text-emphasis flex-1 truncate text-sm font-medium">{row.booking.title}</div>;
        },
      }),
      columnHelper.display({
        id: "who",
        header: () => <span className="text-subtle text-sm font-medium">{t("who")}</span>,
        cell: (props) => {
          const row = props.row.original;
          if (isSeparatorRow(row)) return null;

          const items = row.booking.attendees.map((attendee) => ({
            image: getPlaceholderAvatar(null, attendee.name),
            alt: attendee.name,
            title: attendee.name,
            href: null,
          }));

          return <AvatarGroup size="sm" truncateAfter={4} items={items} />;
        },
      }),
      columnHelper.display({
        id: "team",
        header: () => <span className="text-subtle text-sm font-medium">{t("team")}</span>,
        cell: (props) => {
          const row = props.row.original;
          if (isSeparatorRow(row)) return null;

          if (row.booking.eventType.team) {
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
                // uncomment this line to enable BookingDetailsSheet
                // onClick={() => setSelectedBookingId(booking.id)}
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
          return null;
        },
      }),
      columnHelper.display({
        id: "actions",
        header: () => null,
        cell: () => null,
      }),
    ];
  }, [user, status, t, permissions.canReadOthersBookings]);

  const isEmpty = useMemo(() => !query.data?.bookings.length, [query.data]);

  const groupedBookings = useMemo(() => {
    if (!query.data?.bookings) {
      return { today: [], currentMonth: [], monthBuckets: {} };
    }

    const now = dayjs().tz(user?.timeZone);
    const today = now.format("YYYY-MM-DD");
    const currentMonthStart = now.startOf("month");
    const currentMonthEnd = now.endOf("month");

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
      }
      return true;
    };

    const todayBookings: RowData[] = [];
    const currentMonthBookings: RowData[] = [];
    const monthBuckets: Record<string, RowData[]> = {}; // Key format: "YYYY-MM"

    query.data.bookings.filter(filterBookings).forEach((booking) => {
      const bookingDate = dayjs(booking.startTime).tz(user?.timeZone);
      const bookingDateStr = bookingDate.format("YYYY-MM-DD");
      const monthKey = bookingDate.format("YYYY-MM");

      const rowData: RowData = {
        type: "data",
        booking,
        isToday: bookingDateStr === today,
        recurringInfo: query.data?.recurringInfo.find(
          (info) => info.recurringEventId === booking.recurringEventId
        ),
      };

      if (bookingDateStr === today) {
        todayBookings.push(rowData);
      } else if (bookingDate.isAfter(currentMonthStart) && bookingDate.isBefore(currentMonthEnd)) {
        currentMonthBookings.push(rowData);
      } else if (bookingDate.isAfter(currentMonthEnd)) {
        if (!monthBuckets[monthKey]) {
          monthBuckets[monthKey] = [];
        }
        monthBuckets[monthKey].push(rowData);
      }
    });

    return { today: todayBookings, currentMonth: currentMonthBookings, monthBuckets };
  }, [query.data, status, user?.timeZone]);

  const flatData = useMemo<RowData[]>(() => {
    return [...groupedBookings.currentMonth, ...Object.values(groupedBookings.monthBuckets).flat()];
  }, [groupedBookings]);

  const bookingsToday = useMemo<RowData[]>(() => {
    return groupedBookings.today;
  }, [groupedBookings]);

  const finalData = useMemo<RowData[]>(() => {
    if (status !== "upcoming") {
      return flatData;
    }

    const merged: RowData[] = [];

    // Add Today section
    if (groupedBookings.today.length > 0) {
      merged.push({ type: "separator", label: t("today") }, ...groupedBookings.today);
    }

    // Add Current Month section (rest of this month, excluding today)
    if (groupedBookings.currentMonth.length > 0) {
      merged.push({ type: "separator", label: t("this_month") }, ...groupedBookings.currentMonth);
    }

    // Add individual month sections
    const sortedMonthKeys = Object.keys(groupedBookings.monthBuckets).sort();
    sortedMonthKeys.forEach((monthKey) => {
      const bookings = groupedBookings.monthBuckets[monthKey];
      if (bookings.length > 0) {
        const monthLabel = dayjs(monthKey, "YYYY-MM").format("MMMM YYYY");
        merged.push({ type: "separator", label: monthLabel }, ...bookings);
      }
    });

    return merged;
  }, [groupedBookings, status, t, flatData]);

  const selectedBooking = useMemo(() => {
    if (!selectedBookingId) return null;
    const dataRow = finalData.find(
      (row): row is Extract<RowData, { type: "data" }> =>
        row.type === "data" && row.booking.id === selectedBookingId
    );
    return dataRow?.booking ?? null;
  }, [selectedBookingId, finalData]);

  const bookingNavigation = useBookingCursor({
    bookings: finalData,
    selectedBookingId,
    setSelectedBookingId,
  });

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
        date: true,
        time: true,
        event: true,
        who: true,
        team: true,
        actions: true,
      },
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedUniqueValues,
  });

  const isPending = query.isPending;
  const totalRowCount = query.data?.totalCount;

  return (
    <div className="flex flex-col">
      <div className="flex flex-row flex-wrap justify-between lg:hidden">
        <HorizontalTabs
          tabs={tabs.map((tab) => ({
            ...tab,
            name: t(tab.name),
          }))}
        />
      </div>
      <main className="w-full">
        <div className="flex w-full flex-col">
          {query.status === "error" ? (
            <>
              <div className="grid w-full items-center gap-2 pb-4">
                <div className="flex w-full flex-col gap-2">
                  <div className="flex w-full flex-wrap justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <DataTableFilters.FilterBar table={table} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <DataTableFilters.ClearFiltersButton />
                      <DataTableSegment.SaveButton />
                      <DataTableSegment.Select />
                    </div>
                  </div>
                </div>
              </div>
              <Alert severity="error" title={t("something_went_wrong")} message={query.error.message} />
            </>
          ) : (
            <>
              {!!bookingsToday.length && status === "upcoming" && (
                <WipeMyCalActionButton bookingStatus={status} bookingsEmpty={isEmpty} />
              )}
              {view === "list" ? (
                <BookingsList
                  status={status}
                  table={table}
                  isPending={isPending}
                  totalRowCount={totalRowCount}
                />
              ) : (
                <BookingsCalendar status={status} table={table} />
              )}
            </>
          )}
        </div>
      </main>
      <BookingDetailsSheet
        booking={selectedBooking}
        isOpen={!!selectedBooking}
        onClose={() => setSelectedBookingId(null)}
        userTimeZone={user?.timeZone}
        userTimeFormat={user?.timeFormat === null ? undefined : user?.timeFormat}
        userId={user?.id}
        userEmail={user?.email}
        onPrevious={bookingNavigation.onPrevious}
        hasPrevious={bookingNavigation.hasPrevious}
        onNext={bookingNavigation.onNext}
        hasNext={bookingNavigation.hasNext}
      />
    </div>
  );
}
