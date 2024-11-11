"use client";

import { keepPreviousData } from "@tanstack/react-query";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  createColumnHelper,
} from "@tanstack/react-table";
import { useRef, useMemo } from "react";

import dayjs from "@calcom/dayjs";
import { useCopy } from "@calcom/lib/hooks/useCopy";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc, type RouterOutputs } from "@calcom/trpc";
import { Badge, Avatar, Icon } from "@calcom/ui";
import { DataTable, useFetchMoreOnBottomReached } from "@calcom/ui";

import { useFilterContext } from "../context/provider";

type RoutingFormResponse = RouterOutputs["viewer"]["insights"]["routingFormResponses"]["data"][number];

type RoutingFormDataWithHeaders = RoutingFormResponse & {
  [key: string]: { id: string; value: string };
};

export function RoutingFormResponsesTable() {
  const { t } = useLocale();
  const { filter } = useFilterContext();
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const { copyToClipboard, isCopied } = useCopy();

  const { dateRange, selectedTeamId, isAll, initialConfig, selectedRoutingFormId, selectedMemberUserId } =
    filter;
  const initialConfigIsReady = !!(initialConfig?.teamId || initialConfig?.userId || initialConfig?.isAll);
  const [startDate, endDate] = dateRange;

  const { data, fetchNextPage, isFetching, hasNextPage } =
    trpc.viewer.insights.routingFormResponses.useInfiniteQuery(
      {
        teamId: selectedTeamId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        userId: selectedMemberUserId ?? undefined,
        isAll: isAll ?? false,
        routingFormId: selectedRoutingFormId ?? undefined,
        limit: 20,
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

  const columnHelper = createColumnHelper<RoutingFormDataWithHeaders>();

  const columns = useMemo(
    () => [
      columnHelper.accessor("form.name", {
        id: "formName",
        header: t("form_name"),
      }),
      ...(data?.pages?.[0]?.headers?.map((header) =>
        columnHelper.accessor(header.label, {
          id: header.id,
          header: header.label,
          cell: (info) => {
            const value = info.getValue();
            return value?.value;
          },
        })
      ) ?? []),
      columnHelper.accessor("routedToBooking", {
        id: "bookingStatus",
        header: t("booking_status"),
        cell: (info) => {
          const booking = info.getValue();
          if (!booking || !booking.user) return <Badge variant="warning">{t("no_booking")}</Badge>;

          return (
            <div className="group/booking_status relative flex items-center gap-2">
              <Avatar size="xs" imageSrc={booking.user.avatarUrl ?? ""} alt={booking.user.name ?? ""} />
              <Badge variant="success">{dayjs(booking.createdAt).format("MMM D, YYYY HH:mm")}</Badge>
              <div className="invisible absolute left-0 top-full z-20 translate-y-[-8px] rounded-md bg-white p-2 opacity-0 shadow-md transition-all duration-200 group-hover/booking_status:visible group-hover/booking_status:translate-y-0 group-hover/booking_status:opacity-100">
                <div className="flex items-center gap-3">
                  <Avatar size="sm" imageSrc={booking.user.avatarUrl ?? ""} alt={booking.user.name ?? ""} />
                  <div>
                    <p className="text-sm font-medium">{booking.user.name}</p>
                    <p className="group/booking_status_email flex items-center text-xs text-gray-600">
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
              </div>
            </div>
          );
        },
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, data]
  );

  const table = useReactTable<RoutingFormDataWithHeaders>({
    data: flatData,
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
