"use client";

import { useReactTable, getCoreRowModel, getSortedRowModel } from "@tanstack/react-table";
import { TimezoneBadge } from "@calcom/web/modules/insights/components/booking";

import { useMemo, useEffect } from "react";
import { createPortal } from "react-dom";

import {
  useDataTable,
  ColumnFilterType,
  convertMapToFacetedValues,
  useFilterValue,
  ZSingleSelectFilterValue,
  type FilterableColumn,
} from "@calcom/features/data-table";
import {
  DataTableWrapper,
  DataTableFilters,
  DataTableSegment,
  DataTableSkeleton,
  DateRangeFilter,
} from "@calcom/web/modules/data-table/components";
import type { FilterType } from "@calcom/types/data-table";
import { useInsightsRoutingParameters } from "@calcom/web/modules/insights/hooks/useInsightsRoutingParameters";
import { trpc } from "@calcom/trpc/react";

import { RoutingFormResponsesDownload } from "../filters/Download/RoutingFormResponsesDownload";
import { OrgTeamsFilter } from "../filters/OrgTeamsFilter";
import { useInsightsColumns } from "@calcom/web/modules/insights/hooks/useInsightsColumns";
import { useInsightsOrgTeams } from "@calcom/web/modules/insights/hooks/useInsightsOrgTeams";
import { useInsightsRoutingFacetedUniqueValues } from "@calcom/web/modules/insights/hooks/useInsightsRoutingFacetedUniqueValues";
import type { RoutingFormTableRow } from "@calcom/web/modules/insights/lib/types";
import { RoutingKPICards } from "./RoutingKPICards";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { useLocale } from "@calcom/lib/hooks/useLocale";

export type RoutingFormTableType = ReturnType<typeof useReactTable<RoutingFormTableRow>>;

const createdAtColumn: Extract<FilterableColumn, { type: Extract<FilterType, "dr"> }> = {
  id: "createdAt",
  title: "createdAt",
  type: ColumnFilterType.DATE_RANGE,
};

export function RoutingFormResponsesTable() {
  const { isAll, teamId, userId } = useInsightsOrgTeams();
  const routingFormId = useFilterValue("formId", ZSingleSelectFilterValue)?.data as string | undefined;

  const { t } = useLocale();

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
  const { sorting, limit, offset, ctaContainerRef, updateFilter } = useDataTable();

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
  }, [table, getInsightsFacetedUniqueValues, routingFormId, updateFilter]);

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
    </>
  );
}
