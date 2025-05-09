"use client";

import { useReactTable, getCoreRowModel, getSortedRowModel } from "@tanstack/react-table";
// eslint-disable-next-line no-restricted-imports
import { useMemo, useEffect } from "react";
import { createPortal } from "react-dom";

import {
  DataTableWrapper,
  DataTableFilters,
  DataTableSkeleton,
  useDataTable,
  DateRangeFilter,
  DataTableSegment,
  ColumnFilterType,
  convertMapToFacetedValues,
  type FilterableColumn,
} from "@calcom/features/data-table";
import { trpc } from "@calcom/trpc";

import { RoutingFormResponsesDownload } from "../filters/Download";
import { OrgTeamsFilter } from "../filters/OrgTeamsFilter";
import { useInsightsColumns } from "../hooks/useInsightsColumns";
import { useInsightsFacetedUniqueValues } from "../hooks/useInsightsFacetedUniqueValues";
import { useInsightsParameters } from "../hooks/useInsightsParameters";
import type { RoutingFormTableRow } from "../lib/types";
import { RoutingKPICards } from "./RoutingKPICards";

export type RoutingFormTableType = ReturnType<typeof useReactTable<RoutingFormTableRow>>;

const createdAtColumn: Extract<FilterableColumn, { type: ColumnFilterType.DATE_RANGE }> = {
  id: "createdAt",
  title: "createdAt",
  type: ColumnFilterType.DATE_RANGE,
};

export function RoutingFormResponsesTable() {
  const { isAll, teamId, userId, memberUserIds, routingFormId, startDate, endDate, columnFilters } =
    useInsightsParameters();

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

  const getInsightsFacetedUniqueValues = useInsightsFacetedUniqueValues({ headers, userId, teamId, isAll });

  const { sorting, limit, offset, ctaContainerRef, updateFilter } = useDataTable();

  const { data, isPending } = trpc.viewer.insights.routingFormResponses.useQuery({
    teamId,
    startDate,
    endDate,
    userId,
    memberUserIds,
    isAll,
    routingFormId,
    columnFilters,
    sorting,
    limit,
    offset,
  });

  const processedData = useMemo(() => {
    if (!isHeadersSuccess || !data) return [];
    return data.data as RoutingFormTableRow[];
  }, [data, isHeadersSuccess]);

  const columns = useInsightsColumns({ headers, isHeadersSuccess });

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
        utm_source: false,
        utm_medium: false,
        utm_campaign: false,
        utm_term: false,
        utm_content: false,
      },
    },
    getFacetedUniqueValues: getInsightsFacetedUniqueValues,
  });

  useEffect(() => {
    if (routingFormId) {
      return;
    }
    const routingForms = convertMapToFacetedValues(getInsightsFacetedUniqueValues(table, "formId")());
    const newRoutingFormId = routingForms?.[0]?.value;
    if (newRoutingFormId) {
      // if routing form filter is not set, set it to the first form
      // this also prevents user from clearing the routing form filter
      updateFilter("formId", { type: ColumnFilterType.SINGLE_SELECT, data: newRoutingFormId });
    }
  }, [table, getInsightsFacetedUniqueValues, routingFormId]);

  if (isHeadersLoading && !headers) {
    return <DataTableSkeleton columns={4} columnWidths={[200, 200, 250, 250]} />;
  }

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
          }>
          <RoutingKPICards />
        </DataTableWrapper>
      </div>

      {ctaContainerRef.current &&
        createPortal(
          <>
            <DateRangeFilter column={createdAtColumn} />
            <RoutingFormResponsesDownload sorting={sorting} />
          </>,
          ctaContainerRef.current
        )}
    </>
  );
}
