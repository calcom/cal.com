"use client";

import { keepPreviousData } from "@tanstack/react-query";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  createColumnHelper,
} from "@tanstack/react-table";
// eslint-disable-next-line no-restricted-imports
import startCase from "lodash/startCase";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useMemo, useId, useState } from "react";
import { z } from "zod";

import dayjs from "@calcom/dayjs";
import {
  DataTableWrapper,
  DataTableFilters,
  DataTableProvider,
  DataTableSkeleton,
  useColumnFilters,
  useFilterValue,
  multiSelectFilter,
  textFilter,
  dataTableFilter,
  useDataTable,
  ZDateRangeFilterValue,
  ZMultiSelectFilterValue,
  ZSingleSelectFilterValue,
  DateRangeFilter,
  type FilterableColumn,
} from "@calcom/features/data-table";
import classNames from "@calcom/lib/classNames";
import { useCopy } from "@calcom/lib/hooks/useCopy";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { BookingStatus } from "@calcom/prisma/enums";
import { RoutingFormFieldType } from "@calcom/routing-forms/lib/FieldTypes";
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

import { RoutingFormResponsesDownload } from "../filters/Download";
import type { OrgTeamsType } from "../filters/OrgTeamsFilter";
import { OrgTeamsFilter } from "../filters/OrgTeamsFilter";
import {
  ZResponseMultipleValues,
  ZResponseSingleValue,
  ZResponseTextValue,
  ZResponseNumericValue,
} from "../lib/types";
import { RoutingKPICards } from "./RoutingKPICards";

type RoutingFormTableRow = RouterOutputs["viewer"]["insights"]["routingFormResponses"]["data"][number];

const statusOrder: Record<BookingStatus, number> = {
  [BookingStatus.ACCEPTED]: 1,
  [BookingStatus.PENDING]: 2,
  [BookingStatus.AWAITING_HOST]: 3,
  [BookingStatus.CANCELLED]: 4,
  [BookingStatus.REJECTED]: 5,
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
  attendees: RoutingFormTableRow["bookingAttendees"] | undefined;
  rowId: number;
}) {
  const cellId = useId();
  if (!attendees || attendees.length === 0) return <div className="min-w-[200px]" />;

  return (
    <div className="flex min-w-[200px] flex-wrap gap-1">
      {attendees.map((attendee) => (
        <CellWithOverflowX key={`${cellId}-${attendee.email}-${rowId}`} className="w-[200px]">
          <Badge variant="gray" className="whitespace-nowrap" title={attendee.email}>
            {attendee.name}
          </Badge>
        </CellWithOverflowX>
      ))}
    </div>
  );
}

function ResponseValueCell({
  optionMap,
  values,
  rowId,
}: {
  optionMap: Record<string, string>;
  values: string[];
  rowId: number;
}) {
  const cellId = useId();
  if (values.length === 0) return <div className="h-6 w-[200px]" />;

  return (
    <CellWithOverflowX className="flex w-[200px] gap-1">
      {values.length > 2 ? (
        <>
          {values.slice(0, 2).map((id: string, i: number) => (
            <Badge key={`${cellId}-${i}-${rowId}`} variant="gray">
              {optionMap[id] ?? id}
            </Badge>
          ))}
          <HoverCard>
            <HoverCardTrigger>
              <Badge variant="gray">+{values.length - 2}</Badge>
            </HoverCardTrigger>
            <HoverCardPortal>
              <HoverCardContent side="bottom" align="start" className="w-fit">
                <div className="flex flex-col gap-1">
                  {values.slice(2).map((id: string, i: number) => (
                    <span key={`${cellId}-overflow-${i}-${rowId}`} className="text-default text-sm">
                      {optionMap[id] ?? id}
                    </span>
                  ))}
                </div>
              </HoverCardContent>
            </HoverCardPortal>
          </HoverCard>
        </>
      ) : (
        values.map((id: string, i: number) => (
          <Badge key={`${cellId}-${i}-${rowId}`} variant="gray">
            {optionMap[id] ?? id}
          </Badge>
        ))
      )}
    </CellWithOverflowX>
  );
}

function BookingStatusBadge({ bookingStatus }: { bookingStatus: BookingStatus | null }) {
  let badgeVariant: BadgeProps["variant"] = "success";

  if (!bookingStatus) return null;

  switch (bookingStatus) {
    case BookingStatus.REJECTED:
    case BookingStatus.AWAITING_HOST:
    case BookingStatus.PENDING:
    case BookingStatus.CANCELLED:
      badgeVariant = "warning";
      break;
  }

  return <Badge variant={badgeVariant}>{bookingStatusToText(bookingStatus)}</Badge>;
}

function BookingAtCell({
  row,
  rowId,
  copyToClipboard,
  t,
}: {
  row: RoutingFormTableRow;
  rowId: number;
  copyToClipboard: (text: string) => void;
  t: (key: string) => string;
}) {
  const cellId = useId();

  if (!row.bookingUserId || !row.bookingCreatedAt) {
    return <div className="w-[250px]" />;
  }

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <div className="flex items-center gap-2" key={`${cellId}-booking-${rowId}`}>
          <Avatar size="xs" imageSrc={row.bookingUserAvatarUrl ?? ""} alt={row.bookingUserName ?? ""} />
          <Link href={`/booking/${row.bookingUid}`}>
            <Badge variant="gray">{dayjs(row.bookingCreatedAt).format("MMM D, YYYY HH:mm")}</Badge>
          </Link>
        </div>
      </HoverCardTrigger>
      <HoverCardPortal>
        <HoverCardContent>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <Avatar size="sm" imageSrc={row.bookingUserAvatarUrl ?? ""} alt={row.bookingUserName ?? ""} />
              <div>
                <p className="text-sm font-medium">{row.bookingUserName}</p>
                <p className="group/booking_status_email text-subtle flex items-center text-xs">
                  <span className="truncate">{row.bookingUserEmail}</span>
                  <button
                    className="invisible ml-2 group-hover/booking_status_email:visible"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      copyToClipboard(row.bookingUserEmail ?? "");
                    }}>
                    <Icon name="copy" />
                  </button>
                </p>
              </div>
            </div>
            <div className="text-emphasis mt-4 flex items-center gap-2 text-xs">
              <span>Status:</span>
              <BookingStatusBadge bookingStatus={row.bookingStatus} />
            </div>
          </div>
        </HoverCardContent>
      </HoverCardPortal>
    </HoverCard>
  );
}

export type RoutingFormTableType = ReturnType<typeof useReactTable<RoutingFormTableRow>>;

export function RoutingFormResponsesTable() {
  return (
    <DataTableProvider>
      <RoutingFormResponsesTableContent />
    </DataTableProvider>
  );
}

const createdAtColumn: Extract<FilterableColumn, { type: "date_range" }> = {
  id: "createdAt",
  title: "createdAt",
  type: "date_range",
};

export function RoutingFormResponsesTableContent() {
  const { t } = useLocale();
  const { copyToClipboard } = useCopy();
  const session = useSession();
  const currentOrgId = session.data?.user.org?.id;
  const [orgTeamsType, setOrgTeamsType] = useState<OrgTeamsType>(currentOrgId ? "org" : "yours");
  const [selectedTeamId, setSelectedTeamId] = useState<number | undefined>();

  const columnFilters = useColumnFilters({ exclude: ["bookingUserId", "formId", "createdAt"] });

  const isAll = orgTeamsType === "org";
  const teamId = orgTeamsType === "team" ? selectedTeamId : undefined;
  const userId = orgTeamsType === "yours" ? session.data?.user.id : undefined;

  const memberUserIds = useFilterValue("bookingUserId", ZMultiSelectFilterValue)?.data as
    | number[]
    | undefined;
  const routingFormId = useFilterValue("formId", ZSingleSelectFilterValue)?.data as string | undefined;
  const createdAtRange = useFilterValue("createdAt", ZDateRangeFilterValue)?.data;
  const startDate = createdAtRange?.startDate ?? dayjs().subtract(1, "week").startOf("day").toISOString();
  const endDate = createdAtRange?.endDate ?? dayjs().endOf("day").toISOString();

  const {
    data: headers,
    isLoading: isHeadersLoading,
    isSuccess: isHeadersSuccess,
  } = trpc.viewer.insights.routingFormResponsesHeaders.useQuery({
    userId,
    teamId,
    isAll,
    routingFormId,
  });

  const { data: forms } = trpc.viewer.insights.getRoutingFormsForFilters.useQuery({
    userId,
    teamId,
    isAll,
  });

  const { data: users } = trpc.viewer.insights.userList.useQuery({
    teamId: teamId ?? -1,
    isAll,
  });

  const { sorting, setSorting } = useDataTable();

  const { data, fetchNextPage, isFetching, hasNextPage, isLoading } =
    trpc.viewer.insights.routingFormResponses.useInfiniteQuery(
      {
        teamId,
        startDate,
        endDate,
        userId,
        memberUserIds,
        isAll,
        routingFormId,
        columnFilters,
        sorting,
        limit: 30,
      },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        placeholderData: keepPreviousData,
        trpc: {
          context: { skipBatch: true },
        },
      }
    );

  const processedData = useMemo(() => {
    if (!isHeadersSuccess) return [];
    return (data?.pages?.flatMap((page) => page.data) ?? []) as RoutingFormTableRow[];
  }, [data, isHeadersSuccess]);

  const columnHelper = createColumnHelper<RoutingFormTableRow>();

  const columns = useMemo(() => {
    if (!isHeadersSuccess) {
      return [];
    }
    return [
      columnHelper.accessor("formId", {
        id: "formId",
        header: t("routing_forms"),
        enableColumnFilter: true,
        enableSorting: false,
        meta: {
          filter: { type: "single_select" },
        },
        cell: () => null,
      }),
      columnHelper.accessor("bookingUserId", {
        id: "bookingUserId",
        header: t("people"),
        enableColumnFilter: true,
        enableSorting: false,
        meta: {
          filter: { type: "multi_select" },
        },
        cell: () => null,
      }),
      columnHelper.accessor("bookingAttendees", {
        id: "bookingAttendees",
        header: t("routing_form_insights_booked_by"),
        size: 200,
        enableColumnFilter: false,
        enableSorting: false,
        cell: (info) => {
          return <BookedByCell attendees={info.getValue()} rowId={info.row.original.id} />;
        },
      }),

      ...((headers || []).map((fieldHeader) => {
        const isText = [
          RoutingFormFieldType.TEXT,
          RoutingFormFieldType.EMAIL,
          RoutingFormFieldType.PHONE,
          RoutingFormFieldType.TEXTAREA,
        ].includes(fieldHeader.type as RoutingFormFieldType);

        const isNumber = fieldHeader.type === RoutingFormFieldType.NUMBER;

        const isSingleSelect = fieldHeader.type === RoutingFormFieldType.SINGLE_SELECT;
        const isMultiSelect = fieldHeader.type === RoutingFormFieldType.MULTI_SELECT;

        const filterType = isSingleSelect
          ? "single_select"
          : isNumber
          ? "number"
          : isText
          ? "text"
          : "multi_select";

        const optionMap =
          fieldHeader.options?.reduce((acc, option) => {
            if (option.id) {
              acc[option.id] = option.label;
            }
            return acc;
          }, {} as Record<string, string>) ?? {};

        return columnHelper.accessor(`response.${fieldHeader.id}`, {
          id: fieldHeader.id,
          header: startCase(fieldHeader.label),
          enableSorting: false,
          cell: (info) => {
            const values = info.getValue();
            if (isMultiSelect || isSingleSelect) {
              const result = z.union([ZResponseMultipleValues, ZResponseSingleValue]).safeParse(values);
              return (
                result.success && (
                  <ResponseValueCell
                    optionMap={optionMap}
                    values={Array.isArray(result.data.value) ? result.data.value : [result.data.value]}
                    rowId={info.row.original.id}
                  />
                )
              );
            } else if (isText || isNumber) {
              const result = z.union([ZResponseTextValue, ZResponseNumericValue]).safeParse(values);
              return (
                result.success && (
                  <div className="truncate">
                    <span title={String(result.data.value)}>{result.data.value}</span>
                  </div>
                )
              );
            } else {
              return null;
            }
          },
          meta: {
            filter: { type: filterType },
          },
          filterFn: (row, id, filterValue) => {
            const cellValue = row.original.response[id].value;
            return dataTableFilter(cellValue, filterValue);
          },
        });
      }) ?? []),
      columnHelper.accessor("bookingStatusOrder", {
        id: "bookingStatusOrder",
        header: t("routing_form_insights_booking_status"),
        sortDescFirst: false,
        cell: (info) => (
          <div className="max-w-[250px]">
            <BookingStatusBadge bookingStatus={info.row.original.bookingStatus} />
          </div>
        ),
        meta: {
          filter: { type: "multi_select", icon: "circle" },
        },
        filterFn: (row, id, filterValue) => {
          return multiSelectFilter(row.original.bookingStatusOrder, filterValue);
        },
        sortingFn: (rowA, rowB) => {
          const statusA = rowA.original.bookingStatusOrder ?? 6; // put it at the end if bookingStatusOrder is null
          const statusB = rowB.original.bookingStatusOrder ?? 6;
          return statusA - statusB;
        },
      }),
      columnHelper.accessor("bookingCreatedAt", {
        id: "bookingCreatedAt",
        header: t("routing_form_insights_booking_at"),
        enableColumnFilter: false,
        cell: (info) => (
          <div className="max-w-[250px]">
            <BookingAtCell
              row={info.row.original}
              rowId={info.row.original.id}
              copyToClipboard={copyToClipboard}
              t={t}
            />
          </div>
        ),
        sortingFn: (rowA, rowB) => {
          const dateA = rowA.original.bookingCreatedAt;
          const dateB = rowB.original.bookingCreatedAt;
          if (!dateA && !dateB) return 0;
          if (!dateA) return -1;
          if (!dateB) return 1;
          if (!(dateA instanceof Date) || !(dateB instanceof Date)) return 0;

          return dateA.getTime() - dateB.getTime();
        },
      }),
      columnHelper.accessor("bookingAssignmentReason", {
        id: "bookingAssignmentReason",
        header: t("routing_form_insights_assignment_reason"),
        enableSorting: false,
        meta: {
          filter: { type: "text" },
        },
        cell: (info) => {
          const assignmentReason = info.getValue();
          return <div className="max-w-[250px]">{assignmentReason}</div>;
        },
        filterFn: (row, id, filterValue) => {
          const reason = row.original.bookingAssignmentReason;
          return textFilter(reason, filterValue);
        },
      }),
      columnHelper.accessor("createdAt", {
        id: "createdAt",
        header: t("routing_form_insights_submitted_at"),
        enableColumnFilter: false,
        cell: (info) => (
          <div className="whitespace-nowrap">
            <Badge variant="gray">{dayjs(info.getValue()).format("MMM D, YYYY HH:mm")}</Badge>
          </div>
        ),
      }),
    ];
  }, [isHeadersSuccess, headers, t, copyToClipboard]);

  const table = useReactTable<RoutingFormTableRow>({
    data: processedData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    defaultColumn: {
      size: 150,
    },
    initialState: {
      columnVisibility: {
        formId: false,
        bookingUserId: false,
      },
    },
    state: {
      sorting,
      columnFilters,
    },
    onSortingChange: setSorting,
    getFacetedUniqueValues: (_, columnId) => () => {
      if (!headers) {
        return new Map();
      }

      const fromArrayToMap = (array: { label: string; value: string | number }[]) => {
        return new Map(array.map((option) => [{ label: option.label, value: option.value }, 1]));
      };

      const fieldHeader = headers.find((h) => h.id === columnId);
      if (fieldHeader?.options) {
        return fromArrayToMap(
          fieldHeader.options
            .filter((option): option is { id: string; label: string } => option.id !== null)
            .map((option) => ({
              label: option.label,
              value: option.id,
            }))
        );
      } else if (columnId === "bookingStatusOrder") {
        return fromArrayToMap(
          Object.keys(statusOrder).map((status) => ({
            value: statusOrder[status as BookingStatus],
            label: bookingStatusToText(status as BookingStatus),
          }))
        );
      } else if (columnId === "formId") {
        return fromArrayToMap(
          forms?.map((form) => ({
            label: form.name,
            value: form.id,
          })) ?? []
        );
      } else if (columnId === "bookingUserId") {
        return fromArrayToMap(
          users?.map((user) => ({
            label: user.name ?? user.email,
            value: user.id,
          })) ?? []
        );
      }
      return new Map();
    },
  });

  if ((isHeadersLoading && !headers) || ((isFetching || isLoading) && !data)) {
    return <DataTableSkeleton columns={4} columnWidths={[200, 200, 250, 250]} />;
  }

  return (
    <div className="flex-1">
      <DataTableWrapper
        table={table}
        isPending={isFetching && !data}
        hasNextPage={hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetching={isFetching}
        ToolbarLeft={
          <>
            <OrgTeamsFilter
              selectedType={orgTeamsType}
              selectedTeamId={selectedTeamId}
              onSelected={(params) => {
                setOrgTeamsType(params.type);
                setSelectedTeamId(params.teamId);
              }}
            />
            <DataTableFilters.AddFilterButton table={table} />
            <DataTableFilters.ActiveFilters table={table} />
            <DataTableFilters.ClearFiltersButton exclude={["createdAt"]} />
          </>
        }
        ToolbarRight={
          <>
            <DateRangeFilter column={createdAtColumn} />
            <RoutingFormResponsesDownload
              startDate={startDate}
              endDate={endDate}
              teamId={teamId}
              userId={userId}
              isAll={isAll}
              memberUserIds={memberUserIds}
              routingFormId={routingFormId}
              columnFilters={columnFilters}
              sorting={sorting}
            />
            <DataTableFilters.ColumnVisibilityButton table={table} />
          </>
        }>
        <RoutingKPICards given={{ isAll, teamId, userId }} />
      </DataTableWrapper>
    </div>
  );
}
