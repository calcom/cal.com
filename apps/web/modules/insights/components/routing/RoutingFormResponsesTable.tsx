"use client";

import {
  ColumnFilterType,
  type FilterableColumn,
  ZSingleSelectFilterValue,
} from "@calcom/features/data-table";
import { useLocale } from "@calcom/i18n/useLocale";
import { trpc } from "@calcom/trpc/react";
import type { FilterType } from "@calcom/types/data-table";
import { Button } from "@calcom/ui/components/button";
import {
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@calcom/ui/components/dropdown";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { RoutingTraceSheet } from "@calcom/web/components/booking/RoutingTraceSheet";
import { WrongAssignmentDialog } from "@calcom/web/components/dialog/WrongAssignmentDialog";
import {
  DataTableFilters,
  DataTableSegment,
  DataTableSkeleton,
  DataTableWrapper,
  DateRangeFilter,
} from "@calcom/web/modules/data-table/components";
import { TimezoneBadge } from "@calcom/web/modules/insights/components/booking";
import { useInsightsColumns } from "@calcom/web/modules/insights/hooks/useInsightsColumns";
import { useInsightsOrgTeams } from "@calcom/web/modules/insights/hooks/useInsightsOrgTeams";
import { useInsightsRoutingFacetedUniqueValues } from "@calcom/web/modules/insights/hooks/useInsightsRoutingFacetedUniqueValues";
import { useInsightsRoutingParameters } from "@calcom/web/modules/insights/hooks/useInsightsRoutingParameters";
import type { RoutingFormTableRow } from "@calcom/web/modules/insights/lib/types";
import { createColumnHelper, getCoreRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table";
import { useCallback, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useDataTable } from "~/data-table/hooks/useDataTable";
import { useFilterValue } from "~/data-table/hooks/useFilterValue";
import { RoutingFormResponsesDownload } from "../filters/Download/RoutingFormResponsesDownload";
import { OrgTeamsFilter } from "../filters/OrgTeamsFilter";
import { RoutingKPICards } from "./RoutingKPICards";

export type RoutingFormTableType = ReturnType<typeof useReactTable<RoutingFormTableRow>>;

const createdAtColumn: Extract<FilterableColumn, { type: Extract<FilterType, "dr"> }> = {
  id: "createdAt",
  title: "createdAt",
  type: ColumnFilterType.DATE_RANGE,
};

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: Table component with actions column, routing trace sheet, and wrong assignment dialog
export function RoutingFormResponsesTable() {
  const { isAll, teamId, userId } = useInsightsOrgTeams();
  const routingFormId = useFilterValue("formId", ZSingleSelectFilterValue)?.data as string | undefined;

  const { t } = useLocale();

  const [routingTraceBookingUid, setRoutingTraceBookingUid] = useState<string | null>(null);
  const [wrongAssignmentBooking, setWrongAssignmentBooking] = useState<RoutingFormTableRow | null>(null);

  const { data: headers, isSuccess: isHeadersSuccess } =
    trpc.viewer.insights.routingFormResponsesHeaders.useQuery({
      userId,
      teamId,
      isAll,
      routingFormId,
    });

  const getInsightsFacetedUniqueValues = useInsightsRoutingFacetedUniqueValues({
    headers,
    userId,
    teamId,
    isAll,
  });

  const insightsRoutingParams = useInsightsRoutingParameters();
  const { sorting, limit, offset, ctaContainerRef } = useDataTable();

  const { data, isPending } = trpc.viewer.insights.routingFormResponses.useQuery({
    ...insightsRoutingParams,
    sorting,
    limit,
    offset,
  });
  const processedData = useMemo(() => {
    if (!isHeadersSuccess || !data) return [];
    return data.data as RoutingFormTableRow[];
  }, [data, isHeadersSuccess]);

  const baseColumns = useInsightsColumns({ headers, isHeadersSuccess });

  const openRoutingTrace = useCallback((bookingUid: string) => {
    setRoutingTraceBookingUid(bookingUid);
  }, []);

  const openWrongAssignment = useCallback((row: RoutingFormTableRow) => {
    setWrongAssignmentBooking(row);
  }, []);

  const columns = useMemo(() => {
    const columnHelper = createColumnHelper<RoutingFormTableRow>();
    return [
      ...baseColumns,
      columnHelper.display({
        id: "actions",
        header: t("actions"),
        size: 80,
        cell: (info) => {
          const row = info.row.original;
          if (!row.bookingUid) return null;
          return (
            <Dropdown>
              <DropdownMenuTrigger asChild>
                <Button color="secondary" size="sm" StartIcon="ellipsis" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <DropdownItem
                    type="button"
                    StartIcon="git-merge"
                    onClick={() => openRoutingTrace(row.bookingUid as string)}>
                    {t("routing_trace")}
                  </DropdownItem>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <DropdownItem
                    type="button"
                    color="destructive"
                    StartIcon="flag"
                    onClick={() => openWrongAssignment(row)}>
                    {t("report_wrong_assignment")}
                  </DropdownItem>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </Dropdown>
          );
        },
      }),
    ];
  }, [baseColumns, t, openRoutingTrace, openWrongAssignment]);

  const table = useReactTable<RoutingFormTableRow>({
    data: processedData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    defaultColumn: {
      size: 150,
    },
    initialState: {
      columnVisibility: {
        formId: false,
        bookingUserId: false,
        attendeeName: false,
        attendeeEmail: false,
        attendeePhone: false,
        utm_source: false,
        utm_medium: false,
        utm_campaign: false,
        utm_term: false,
        utm_content: false,
      },
    },
    getFacetedUniqueValues: getInsightsFacetedUniqueValues,
  });

  return (
    <>
      <div className="flex-1">
        <DataTableWrapper<RoutingFormTableRow>
          table={table}
          isPending={isPending}
          rowClassName="min-h-14"
          paginationMode="standard"
          totalRowCount={data?.total}
          LoaderView={<DataTableSkeleton columns={4} columnWidths={[200, 200, 250, 250]} />}
          ToolbarLeft={
            <>
              <DataTableFilters.ColumnVisibilityButton table={table} />
              <OrgTeamsFilter />
              <DataTableFilters.FilterBar table={table} />
            </>
          }
          ToolbarRight={
            <>
              <DataTableFilters.ClearFiltersButton exclude={["createdAt"]} />
              <DataTableSegment.SaveButton />
              <DataTableSegment.Select />
            </>
          }
          EmptyView={
            <EmptyScreen
              headline={t("no_results")}
              className="bg-muted mb-16"
              iconWrapperClassName="bg-default"
              dashedBorder={false}
            />
          }>
          <RoutingKPICards />
        </DataTableWrapper>
      </div>

      {ctaContainerRef.current &&
        createPortal(
          <div className=" flex gap-2 items-center mb-2 md:mb-0">
            <DateRangeFilter column={createdAtColumn} options={{ convertToTimeZone: true }} />
            <RoutingFormResponsesDownload sorting={sorting} />
            <TimezoneBadge />
          </div>,
          ctaContainerRef.current
        )}

      {routingTraceBookingUid && (
        <RoutingTraceSheet
          isOpen={!!routingTraceBookingUid}
          setIsOpen={(open) => {
            if (!open) setRoutingTraceBookingUid(null);
          }}
          bookingUid={routingTraceBookingUid}
          onReport={() => {
            const row = processedData.find((r) => r.bookingUid === routingTraceBookingUid);
            if (row) {
              setWrongAssignmentBooking(row);
            }
          }}
        />
      )}

      {wrongAssignmentBooking?.bookingUid && (
        <WrongAssignmentDialog
          isOpenDialog={!!wrongAssignmentBooking}
          setIsOpenDialog={(open) => {
            if (!open) setWrongAssignmentBooking(null);
          }}
          booking={{
            uid: wrongAssignmentBooking.bookingUid,
            eventType: wrongAssignmentBooking.formTeamId
              ? { team: { id: wrongAssignmentBooking.formTeamId } }
              : null,
            user: wrongAssignmentBooking.bookingUserEmail
              ? {
                  email: wrongAssignmentBooking.bookingUserEmail,
                  name: wrongAssignmentBooking.bookingUserName ?? null,
                }
              : null,
            assignmentReasonSortedByCreatedAt: wrongAssignmentBooking.bookingAssignmentReason
              ? [{ reasonString: wrongAssignmentBooking.bookingAssignmentReason, reasonEnum: null }]
              : [],
            attendees: wrongAssignmentBooking.bookingAttendees.map((a) => ({ email: a.email })),
          }}
        />
      )}
    </>
  );
}
