"use client";

import { Button } from "@calid/features/ui/components/button";
import { BlankCard } from "@calid/features/ui/components/card";
import type { HorizontalTabItemProps } from "@calid/features/ui/components/navigation";
import { HorizontalTabs } from "@calid/features/ui/components/navigation";
import type { VerticalTabItemProps } from "@calid/features/ui/components/navigation";
import { triggerToast } from "@calid/features/ui/components/toast";
import { useReactTable, getCoreRowModel, getSortedRowModel, createColumnHelper } from "@tanstack/react-table";
import { useSearchParams } from "next/navigation";
import { useMemo, useState, useRef, useEffect } from "react";

import { WipeMyCalActionButton } from "@calcom/app-store/wipemycalother/components";
import dayjs from "@calcom/dayjs";
import ExportBookingsButton from "@calcom/features/bookings/components/ExportBookingsButton";
import { useFilterQuery } from "@calcom/features/bookings/lib/useFilterQuery";
import {
  useDataTable,
  DataTableProvider,
  DataTableWrapper,
  DataTableFilters,
  DataTableSegment,
  ColumnFilterType,
  useFilterValue,
  ZMultiSelectFilterValue,
  ZDateRangeFilterValue,
  ZTextFilterValue,
} from "@calcom/features/data-table";
import { useSegments } from "@calcom/features/data-table/hooks/useSegments";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import { Alert } from "@calcom/ui/components/alert";

import BookingListItem from "@components/booking/BookingListItem";
import SkeletonLoader from "@components/booking/SkeletonLoader";

import { useFacetedUniqueValues } from "~/bookings/hooks/useFacetedUniqueValues";
import type { validStatuses } from "~/bookings/lib/validStatuses";

type BookingListingStatus = (typeof validStatuses)[number];
type BookingOutput = RouterOutputs["viewer"]["bookings"]["get"]["bookings"][0];

// Updated RecurringInfo type to match new backend structure
type RecurringInfo = {
  recurringEventId: string; // Now uses booking.uid instead of separate recurringEventId
  count: number; // Total occurrences including cancelled
  firstDate: Date | null;
  bookings: {
    CANCELLED: Date[];
    ACCEPTED: Date[];
    REJECTED: Date[];
    PENDING: Date[];
    AWAITING_HOST: Date[];
  };
};

const descriptionByStatus: Record<BookingListingStatus, string> = {
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
    <DataTableProvider useSegments={useSegments}>
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
  const { t } = useLocale();
  const user = useMeQuery().data;
  const [expandedBooking, setExpandedBooking] = useState<number | null>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();

  const { data: filterQuery } = useFilterQuery();

  const { status: _status, ...filterQueryWithoutStatus } = filterQuery;

  const { mutate: fetchAllBookingsMutation, isPending } = trpc.viewer.bookings.export.useMutation({
    async onSuccess(response) {
      triggerToast(response.message, "success");
    },
    onError() {
      triggerToast(t("unexpected_error_try_again"), "error");
    },
  });
  const handleOnClickExportBookings = async () => {
    await fetchAllBookingsMutation({
      filters: {
        ...filterQueryWithoutStatus,
      },
    });
    return;
  };

  // Generate dynamic tabs that preserve query parameters
  const tabs: (VerticalTabItemProps | HorizontalTabItemProps)[] = useMemo(() => {
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
  }, [searchParams?.toString()]);

  const eventTypeIds = useFilterValue("eventTypeId", ZMultiSelectFilterValue)?.data as number[] | undefined;
  const teamIds = useFilterValue("teamId", ZMultiSelectFilterValue)?.data as number[] | undefined;
  const userIds = useFilterValue("userId", ZMultiSelectFilterValue)?.data as number[] | undefined;
  const dateRange = useFilterValue("dateRange", ZDateRangeFilterValue)?.data;
  const attendeeName = useFilterValue("attendeeName", ZTextFilterValue);
  const attendeeEmail = useFilterValue("attendeeEmail", ZTextFilterValue);

  const { limit, offset } = useDataTable();
  const [showFilters, setShowFilters] = useState(false);

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
        enableColumnFilter: true,
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
      columnHelper.display({
        id: "customView",
        cell: (props) => {
          if (props.row.original.type === "data") {
            const { booking, recurringInfo, isToday } = props.row.original;
            return (
              <BookingListItem
                key={booking.id && expandedBooking}
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
                expandedBooking={expandedBooking}
                setExpandedBooking={setExpandedBooking}
              />
            );
          } else if (props.row.original.type === "today") {
            return <p className="w-full py-2 pl-2 text-sm font-semibold uppercase leading-4">{t("today")}</p>;
          } else if (props.row.original.type === "next") {
            return <p className="w-full py-2 pl-2 text-sm font-semibold capitalize leading-4">{t("next")}</p>;
          }
        },
      }),
    ];
  }, [user, status, t, expandedBooking]);

  const isEmpty = useMemo(() => !query.data?.bookings.length, [query.data]);

  // Helper function to check if a booking is recurring based on new metadata structure
  const isRecurringBooking = (booking: BookingOutput): boolean => {
    const metadata = booking.metadata as Record<string, any> | null;
    return !!metadata?.recurringEvent;
  };

  // Helper function to check if a booking instance is cancelled (in exDates)
  const isBookingInstanceCancelled = (booking: BookingOutput): boolean => {
    const metadata = booking.metadata as Record<string, any> | null;
    const recurringEvent = metadata?.recurringEvent;

    if (!recurringEvent || !recurringEvent.exDates) {
      return false;
    }

    // Format the booking's start time to compare with exDates
    const bookingStartDate = dayjs(booking.startTime).format("YYYY-MM-DD");

    // Check if this booking's date is in the exDates array
    return recurringEvent.exDates.some((exDate: string | Date) => {
      const exDateFormatted = dayjs(exDate).format("YYYY-MM-DD");
      return exDateFormatted === bookingStartDate;
    });
  };

  // REMOVED: Old filtering logic that grouped by recurringEventId
  // NEW: All bookings are shown as they are - single record represents entire series
  // ADDED: Filter out cancelled recurring instances in the upcoming tab
  const flatData = useMemo<RowData[]>(() => {
    // For recurring tab, only show bookings that have recurringEvent in metadata
    if (status === "recurring") {
      return (
        query.data?.bookings.filter(isRecurringBooking).map((booking) => ({
          type: "data" as const,
          booking,
          recurringInfo: query.data?.recurringInfo.find((info) => info.recurringEventId === booking.uid),
          isToday: false,
        })) || []
      );
    }

    // For upcoming, filter out today's bookings AND cancelled recurring instances
    if (status === "upcoming") {
      return (
        query.data?.bookings
          .filter(
            (booking) =>
              dayjs(booking.startTime).tz(user?.timeZone).format("YYYY-MM-DD") !==
                dayjs().tz(user?.timeZone).format("YYYY-MM-DD") &&
              // Filter out cancelled recurring instances
              !isBookingInstanceCancelled(booking)
          )
          .map((booking) => ({
            type: "data" as const,
            booking,
            recurringInfo: query.data?.recurringInfo.find((info) => info.recurringEventId === booking.uid),
            isToday: false,
          })) || []
      );
    }

    // For all other statuses, show all bookings
    return (
      query.data?.bookings.map((booking) => ({
        type: "data" as const,
        booking,
        recurringInfo: query.data?.recurringInfo.find((info) => info.recurringEventId === booking.uid),
        isToday: false,
      })) || []
    );
  }, [query.data, status, user?.timeZone]);

  const bookingsToday = useMemo<RowData[]>(() => {
    return (
      query.data?.bookings
        .filter(
          (booking: BookingOutput) =>
            dayjs(booking.startTime).tz(user?.timeZone).format("YYYY-MM-DD") ===
              dayjs().tz(user?.timeZone).format("YYYY-MM-DD") &&
            // Also filter out cancelled recurring instances from today's bookings
            !isBookingInstanceCancelled(booking)
        )
        .map((booking) => ({
          type: "data" as const,
          booking,
          recurringInfo: query.data?.recurringInfo.find((info) => info.recurringEventId === booking.uid),
          isToday: true,
        })) ?? []
    );
  }, [query.data, user?.timeZone]);

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
      },
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedUniqueValues,
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

        <div className="flex h-[32px] flex-row gap-4 overflow-auto ">
          <Button
            color="secondary"
            StartIcon="filter"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2">
            <span>{t("filter")}</span>
          </Button>

          <ExportBookingsButton
            handleOnClickExportBookings={handleOnClickExportBookings}
            isLoading={isPending}
          />

          <DataTableSegment.SaveButton />
          <DataTableSegment.Select />
        </div>
      </div>
      <main className="w-full">
        <div className="flex w-full flex-col">
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
                    {showFilters && (
                      <div className="bg-default flex flex-row gap-2 rounded-md">
                        <DataTableFilters.FilterBar table={table} />
                        <DataTableFilters.ClearFiltersButton />
                      </div>
                    )}
                  </>
                }
                LoaderView={<SkeletonLoader />}
                EmptyView={
                  <div className="w-full pt-2">
                    <BlankCard
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
        </div>
      </main>
    </div>
  );
}
