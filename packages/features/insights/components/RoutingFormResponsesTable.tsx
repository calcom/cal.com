"use client";

import { keepPreviousData } from "@tanstack/react-query";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  createColumnHelper,
} from "@tanstack/react-table";
import Link from "next/link";
import { useRef, useMemo, useId } from "react";

import dayjs from "@calcom/dayjs";
import classNames from "@calcom/lib/classNames";
import { useCopy } from "@calcom/lib/hooks/useCopy";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { BookingStatus } from "@calcom/prisma/enums";
import { trpc, type RouterOutputs } from "@calcom/trpc";
import { DataTable, useFetchMoreOnBottomReached, Badge, Avatar, Icon } from "@calcom/ui";
import type { BadgeProps } from "@calcom/ui/components/badge/Badge";

import { useFilterContext } from "../context/provider";

type RoutingFormResponse = RouterOutputs["viewer"]["insights"]["routingFormResponses"]["data"][number];

type RoutingFormTableRow = {
  id: number;
  formName: string;
  createdAt: Date;
  routedToBooking: RoutingFormResponse["routedToBooking"];
  [key: string]: any;
};

function CellWithOverflowX({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={classNames("group relative max-w-[200px]", className)}>
      <div
        className="no-scrollbar overflow-x-auto whitespace-nowrap"
        ref={(el) => {
          // Only add shadow if the scroll width is greater than 200px
          if (!el) return;
          const nextElement = el.nextElementSibling;
          if (!nextElement) return;

          if (el.scrollWidth > 200) {
            nextElement.classList.remove("hidden");
          } else {
            nextElement.classList.add("hidden");
          }
        }}>
        {children}
      </div>
      <div className="absolute right-0 top-0 hidden h-full w-8 bg-gradient-to-l from-white to-transparent group-hover:from-gray-100" />
    </div>
  );
}

// Upper case the first letter of each word and replace underscores with spaces
function bookingStatusToText(status: BookingStatus) {
  return status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function BookedByCell({
  attendees,
  rowId,
}: {
  attendees: RoutingFormResponse["routedToBooking"]["attendees"];
  rowId: number;
}) {
  const cellId = useId();
  if (!attendees) return null;

  return attendees.map((attendee) => (
    <CellWithOverflowX key={`${cellId}-${attendee.email}-${rowId}`} className="w-[200px]">
      <Badge variant="gray" className="whitespace-nowrap">
        {attendee.email}
      </Badge>
    </CellWithOverflowX>
  ));
}

function ResponseValueCell({ value, rowId }: { value: string[]; rowId: number }) {
  const cellId = useId();
  if (value.length === 0) return null;

  return (
    <CellWithOverflowX>
      <div className="flex flex-wrap gap-1">
        {value.length > 2 ? (
          <>
            {value.slice(0, 2).map((v: string, i: number) => (
              <Badge key={`${cellId}-${i}-${rowId}`} variant="gray">
                {v}
              </Badge>
            ))}
            <div className="group/badge relative">
              <Badge variant="gray">+{value.length - 2}</Badge>
              <div className="bg-default invisible absolute left-0 top-full z-20 translate-y-[-8px] rounded-md p-2 opacity-0 shadow-md transition-all duration-200 group-hover/badge:visible group-hover/badge:translate-y-0 group-hover/badge:opacity-100">
                <div className="flex flex-col gap-1">
                  {value.slice(2).map((v: string, i: number) => (
                    <span key={`${cellId}-overflow-${i}-${rowId}`} className="text-sm text-gray-600">
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          value.map((v: string, i: number) => (
            <Badge key={`${cellId}-${i}-${rowId}`} variant="gray">
              {v}
            </Badge>
          ))
        )}
      </div>
    </CellWithOverflowX>
  );
}

function BookingStatusCell({
  booking,
  rowId,
  copyToClipboard,
  t,
}: {
  booking: RoutingFormResponse["routedToBooking"];
  rowId: number;
  copyToClipboard: (text: string) => void;
  t: (key: string) => string;
}) {
  const cellId = useId();

  if (!booking || !booking.user) {
    return (
      <Badge variant="error" className="ml-6" key={`${cellId}-no-booking-${rowId}`}>
        {t("no_booking")}
      </Badge>
    );
  }

  let badgeVariant: BadgeProps["variant"] = "success";
  switch (booking.status) {
    case BookingStatus.REJECTED:
    case BookingStatus.AWAITING_HOST:
    case BookingStatus.PENDING:
    case BookingStatus.CANCELLED:
      badgeVariant = "warning";
      break;
  }

  return (
    <div className="group/booking_status relative flex items-center gap-2" key={`${cellId}-booking-${rowId}`}>
      <Avatar size="xs" imageSrc={booking.user.avatarUrl ?? ""} alt={booking.user.name ?? ""} />
      <Link href={`/booking/${booking.uid}`}>
        <Badge variant={badgeVariant}>{dayjs(booking.createdAt).format("MMM D, YYYY HH:mm")}</Badge>
      </Link>
      <div className="bg-default invisible absolute left-0 top-full z-20 translate-y-[-8px] rounded-md p-2 opacity-0 shadow-md transition-all duration-200 group-hover/booking_status:visible group-hover/booking_status:translate-y-0 group-hover/booking_status:opacity-100 ">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <Avatar size="sm" imageSrc={booking.user.avatarUrl ?? ""} alt={booking.user.name ?? ""} />
            <div>
              <p className="text-sm font-medium">{booking.user.name}</p>
              <p className="group/booking_status_email text-subtle flex items-center text-xs">
                <span className="truncate">{booking.user.email}</span>
                <button
                  className="invisible ml-2 group-hover/booking_status_email:visible"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    copyToClipboard(booking.user?.email ?? "");
                  }}>
                  <Icon name="copy" />
                </button>
              </p>
            </div>
          </div>
          <div className="text-emphasis mt-4 flex items-center gap-2 text-xs">
            <span>Status:</span>
            <Badge variant={badgeVariant}>{bookingStatusToText(booking.status)}</Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RoutingFormResponsesTable() {
  const { t } = useLocale();
  const { filter } = useFilterContext();
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const { copyToClipboard, isCopied } = useCopy();

  const {
    dateRange,
    selectedTeamId,
    isAll,
    initialConfig,
    selectedRoutingFormId,
    selectedMemberUserId,
    selectedBookingStatus,
    selectedRoutingFormFilter,
  } = filter;
  const initialConfigIsReady = !!(initialConfig?.teamId || initialConfig?.userId || initialConfig?.isAll);
  const [startDate, endDate] = dateRange;

  const { data: headers } = trpc.viewer.insights.routingFormResponsesHeaders.useQuery(
    {
      teamId: selectedTeamId,
      isAll: isAll ?? false,
      organizationId: initialConfig?.organizationId,
      routingFormId: selectedRoutingFormId ?? undefined,
    },
    {
      enabled: initialConfigIsReady,
    }
  );

  const { data, fetchNextPage, isFetching, hasNextPage } =
    trpc.viewer.insights.routingFormResponses.useInfiniteQuery(
      {
        teamId: selectedTeamId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        userId: selectedMemberUserId ?? undefined,
        isAll: isAll ?? false,
        routingFormId: selectedRoutingFormId ?? undefined,
        bookingStatus: selectedBookingStatus ?? undefined,
        fieldFilter: selectedRoutingFormFilter ?? undefined,
        limit: 10,
      },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        placeholderData: keepPreviousData,
        trpc: {
          context: { skipBatch: true },
        },
        enabled: initialConfigIsReady,
      }
    );

  const flatData = useMemo(() => data?.pages?.flatMap((page) => page.data) ?? [], [data]);
  const totalDBRowCount = data?.pages?.[0]?.total ?? 0;
  const totalFetched = flatData.length;

  const processedData = useMemo(() => {
    return flatData.map((response) => {
      const row: RoutingFormTableRow = {
        id: response.id,
        formName: response.form.name,
        formId: response.form.id,
        createdAt: response.createdAt,
        routedToBooking: response.routedToBooking,
      };

      Object.entries(response.response).forEach(([fieldId, field]) => {
        const header = headers?.find((h) => h.id === fieldId);

        if (header?.options) {
          if (Array.isArray(field.value)) {
            // Map the IDs to their corresponding labels for array values
            const labels = field.value.map((id) => {
              const option = header.options?.find((opt) => opt.id === id);
              return option?.label ?? id;
            });
            row[fieldId] = labels;
          } else {
            // Handle single value case
            const option = header.options?.find((opt) => opt.id === field.value);
            row[fieldId] = option?.label ?? field.value;
          }
        } else {
          row[fieldId] = field.value;
        }
      });

      return row;
    });
  }, [flatData, headers]);

  const columnHelper = createColumnHelper<RoutingFormTableRow>();

  const columns = useMemo(
    () => [
      columnHelper.accessor("bookedAttendees", {
        id: "bookedBy",
        header: t("routing_form_insights_booked_by"),
        cell: (info) => {
          const row = info.row.original;
          return <BookedByCell attendees={row.routedToBooking?.attendees} rowId={row.id} />;
        },
      }),
      ...(headers?.map((header) => {
        return columnHelper.accessor(header.id, {
          id: `${header.formId}-${header.id}`,
          header: header.label,
          cell: (info) => {
            let value = info.getValue();
            value = Array.isArray(value) ? value : [value];
            return <ResponseValueCell value={value} rowId={info.row.original.id} />;
          },
        });
      }) ?? []),

      columnHelper.accessor("routedToBooking", {
        id: "bookingStatus",
        header: t("routing_form_insights_booking_status"),
        cell: (info) => (
          <BookingStatusCell
            booking={info.getValue()}
            rowId={info.row.original.id}
            copyToClipboard={copyToClipboard}
            t={t}
          />
        ),
      }),
    ],
    [headers, t, copyToClipboard]
  );

  const table = useReactTable<RoutingFormTableRow>({
    data: processedData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const fetchMoreOnBottomReached = useFetchMoreOnBottomReached(
    tableContainerRef,
    fetchNextPage,
    isFetching,
    totalFetched,
    totalDBRowCount
  );

  return (
    <div className="flex-1">
      <DataTable
        table={table}
        tableContainerRef={tableContainerRef}
        onScroll={(e) => {
          if (hasNextPage) {
            fetchMoreOnBottomReached(e.target as HTMLDivElement);
          }
        }}
        isPending={isFetching && !data}
      />
    </div>
  );
}
