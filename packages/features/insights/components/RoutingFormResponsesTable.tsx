"use client";

import { keepPreviousData } from "@tanstack/react-query";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
} from "@tanstack/react-table";
// eslint-disable-next-line no-restricted-imports
import { useMemo, useEffect } from "react";

import {
  DataTableWrapper,
  DataTableFilters,
  DataTableSkeleton,
  useDataTable,
  DateRangeFilter,
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

  const { sorting, updateFilter } = useDataTable();

  const { data, fetchNextPage, isFetching, isPending, hasNextPage, isLoading } =
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

  const columns = useInsightsColumns({ headers, isHeadersSuccess });

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

  if ((isHeadersLoading && !headers) || ((isFetching || isLoading) && !data)) {
    return <DataTableSkeleton columns={4} columnWidths={[200, 200, 250, 250]} />;
  }

  return (
    <>
      <div className="flex-1">
        <DataTableWrapper
          table={table}
          isPending={isPending}
          hasNextPage={hasNextPage}
          fetchNextPage={fetchNextPage}
          isFetching={isFetching}
          ToolbarLeft={
            <>
              <OrgTeamsFilter />
              <DataTableFilters.AddFilterButton table={table} />
              <DataTableFilters.ActiveFilters table={table} />
              <DataTableFilters.ClearFiltersButton exclude={["createdAt"]} />
            </>
          }
          ToolbarRight={
            <>
              <DateRangeFilter column={createdAtColumn} />
              <RoutingFormResponsesDownload sorting={sorting} />
              <DataTableFilters.ColumnVisibilityButton table={table} />
            </>
          }>
          <RoutingKPICards />
        </DataTableWrapper>
      </div>
    </>
  );
}
