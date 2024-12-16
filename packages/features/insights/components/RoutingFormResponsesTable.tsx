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
import { DataTable, DataTableSkeleton, useFetchMoreOnBottomReached } from "@calcom/features/data-table";
import classNames from "@calcom/lib/classNames";
import { useCopy } from "@calcom/lib/hooks/useCopy";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { BookingStatus } from "@calcom/prisma/enums";
import { trpc, type RouterOutputs } from "@calcom/trpc";
import {
  Badge,
  Avatar,
  Icon,
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
  type BadgeProps,
  HoverCardPortal,
} from "@calcom/ui";

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
        className="no-scrollbar flex gap-1 overflow-x-auto whitespace-nowrap"
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
      <div className="from-default absolute right-0 top-0 hidden h-full w-8 bg-gradient-to-l to-transparent " />
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
  attendees: { email: string; timeZone: string }[] | undefined;
  rowId: number;
}) {
  const cellId = useId();
  if (!attendees || attendees.length === 0) return <div className="min-w-[200px]" />;

  return (
    <div className="flex min-w-[200px] flex-wrap gap-1">
      {attendees.map((attendee) => (
        <CellWithOverflowX key={`${cellId}-${attendee.email}-${rowId}`} className="w-[200px]">
          <Badge variant="gray" className="whitespace-nowrap">
            {attendee.email}
          </Badge>
        </CellWithOverflowX>
      ))}
    </div>
  );
}

function ResponseValueCell({ value, rowId }: { value: string[]; rowId: number }) {
  const cellId = useId();
  if (value.length === 0) return <div className="h-6 w-[200px]" />;

  return (
    <CellWithOverflowX className="flex w-[200px] gap-1">
      {value.length > 2 ? (
        <>
          {value.slice(0, 2).map((v: string, i: number) => (
            <Badge key={`${cellId}-${i}-${rowId}`} variant="gray">
              {v}
            </Badge>
          ))}
          <HoverCard>
            <HoverCardTrigger>
              <Badge variant="gray">+{value.length - 2}</Badge>
            </HoverCardTrigger>
            <HoverCardPortal>
              <HoverCardContent side="bottom" align="start" className="w-fit">
                <div className="flex flex-col gap-1">
                  {value.slice(2).map((v: string, i: number) => (
                    <span key={`${cellId}-overflow-${i}-${rowId}`} className="text-default text-sm">
                      {v}
                    </span>
                  ))}
                </div>
              </HoverCardContent>
            </HoverCardPortal>
          </HoverCard>
        </>
      ) : (
        value.map((v: string, i: number) => (
          <Badge key={`${cellId}-${i}-${rowId}`} variant="gray">
            {v}
          </Badge>
        ))
      )}
    </CellWithOverflowX>
  );
}

function BookingStatusBadge({ booking }: { booking: RoutingFormResponse["routedToBooking"] }) {
  let badgeVariant: BadgeProps["variant"] = "success";

  if (!booking) return null;

  switch (booking.status) {
    case BookingStatus.REJECTED:
    case BookingStatus.AWAITING_HOST:
    case BookingStatus.PENDING:
    case BookingStatus.CANCELLED:
      badgeVariant = "warning";
      break;
  }

  return <Badge variant={badgeVariant}>{bookingStatusToText(booking.status)}</Badge>;
}

function BookingAtCell({
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
    return <div className="w-[250px]" />;
  }

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <div className="flex items-center gap-2" key={`${cellId}-booking-${rowId}`}>
          <Avatar size="xs" imageSrc={booking.user.avatarUrl ?? ""} alt={booking.user.name ?? ""} />
          <Link href={`/booking/${booking.uid}`}>
            <Badge variant="gray">{dayjs(booking.createdAt).format("MMM D, YYYY HH:mm")}</Badge>
          </Link>
        </div>
      </HoverCardTrigger>
      <HoverCardPortal>
        <HoverCardContent>
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
              <BookingStatusBadge booking={booking} />
            </div>
          </div>
        </HoverCardContent>
      </HoverCardPortal>
    </HoverCard>
  );
}

export type RoutingFormTableType = ReturnType<typeof useReactTable<RoutingFormTableRow>>;

export function RoutingFormResponsesTable({
  children,
}: {
  children?: React.ReactNode | ((table: RoutingFormTableType) => React.ReactNode);
}) {
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

  const { data: headers, isLoading: isHeadersLoading } =
    trpc.viewer.insights.routingFormResponsesHeaders.useQuery(
      {
        teamId: selectedTeamId ?? undefined,
        isAll: isAll ?? false,
        routingFormId: selectedRoutingFormId ?? undefined,
      },
      {
        enabled: initialConfigIsReady,
      }
    );

  const { data, fetchNextPage, isFetching, hasNextPage, isLoading } =
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
        limit: 30,
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
    if (isHeadersLoading) return [];
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
  }, [flatData, headers, isHeadersLoading]);

  const statusOrder: Record<BookingStatus, number> = {
    [BookingStatus.ACCEPTED]: 1,
    [BookingStatus.PENDING]: 2,
    [BookingStatus.AWAITING_HOST]: 3,
    [BookingStatus.CANCELLED]: 4,
    [BookingStatus.REJECTED]: 5,
  };

  const columnHelper = createColumnHelper<RoutingFormTableRow>();

  const columns = useMemo(
    () => [
      columnHelper.accessor("bookedAttendees", {
        id: "bookedBy",
        header: t("routing_form_insights_booked_by"),
        size: 200,
        cell: (info) => {
          const row = info.row.original;
          return <BookedByCell attendees={row.routedToBooking?.attendees || []} rowId={row.id} />;
        },
      }),

      ...(headers?.map((header) => {
        return columnHelper.accessor(header.id, {
          id: header.id,
          header: header.label,
          size: 200,
          cell: (info) => {
            let value = info.getValue();
            value = Array.isArray(value) ? value : [value];
            return (
              <div className="max-w-[200px]">
                <ResponseValueCell value={value} rowId={info.row.original.id} />
              </div>
            );
          },
        });
      }) ?? []),
      columnHelper.accessor("routedToBooking", {
        id: "bookingStatus",
        header: t("routing_form_insights_booking_status"),
        size: 250,
        cell: (info) => (
          <div className="max-w-[250px]">
            <BookingStatusBadge booking={info.getValue()} />
          </div>
        ),
        sortingFn: (rowA, rowB) => {
          const statusA = rowA.original.routedToBooking?.status;
          const statusB = rowB.original.routedToBooking?.status;
          // Default to highest number (5) + 1 for null/undefined values to sort them last
          const orderA = statusA ? statusOrder[statusA] : 6;
          const orderB = statusB ? statusOrder[statusB] : 6;
          return orderA - orderB;
        },
      }),
      columnHelper.accessor("routedToBooking", {
        id: "bookingAt",
        header: t("routing_form_insights_booking_at"),
        size: 250,
        cell: (info) => (
          <div className="max-w-[250px]">
            <BookingAtCell
              booking={info.getValue()}
              rowId={info.row.original.id}
              copyToClipboard={copyToClipboard}
              t={t}
            />
          </div>
        ),
      }),
      columnHelper.accessor("routedToBooking", {
        id: "assignmentReason",
        header: t("routing_form_insights_assignment_reason"),
        size: 250,
        cell: (info) => {
          const assignmentReason = info.getValue()?.assignmentReason;
          return (
            <div className="max-w-[250px]">
              {assignmentReason && assignmentReason.length > 0 ? assignmentReason[0].reasonString : ""}
            </div>
          );
        },
      }),
      columnHelper.accessor("createdAt", {
        id: "submittedAt",
        header: t("routing_form_insights_submitted_at"),
        size: 250,
        cell: (info) => (
          <div className="whitespace-nowrap">
            <Badge variant="gray">{dayjs(info.getValue()).format("MMM D, YYYY HH:mm")}</Badge>
          </div>
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
    defaultColumn: {
      size: 200,
    },
  });

  const fetchMoreOnBottomReached = useFetchMoreOnBottomReached({
    tableContainerRef,
    hasNextPage,
    fetchNextPage,
    isFetching,
  });

  if (isHeadersLoading || ((isFetching || isLoading) && !data)) {
    return <DataTableSkeleton columns={4} columnWidths={[200, 200, 250, 250]} />;
  }

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
        isPending={isFetching && !data}>
        {typeof children === "function" ? children(table) : children}
      </DataTable>
    </div>
  );
}
