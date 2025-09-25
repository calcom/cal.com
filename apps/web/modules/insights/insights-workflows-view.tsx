"use client";

import { useInsightsWorkflows } from "@calid/features/modules/insights/hooks/useInsightsWorkflows";
import { WorkflowKPICards } from "@calid/features/modules/insights/workflows/WorkflowKPICards";
import { WorkflowStatusLineChart } from "@calid/features/modules/insights/workflows/WorkflowStatusLineChart";

import type { FilterableColumn } from "@calcom/features/data-table";
import { ColumnFilterType, DataTableFilters, DateRangeFilter } from "@calcom/features/data-table";
import { DataTableProvider } from "@calcom/features/data-table/DataTableProvider";
import { InsightsOrgTeamsProvider } from "@calcom/features/insights/context/InsightsOrgTeamsProvider";
import { Download } from "@calcom/features/insights/filters/Download";
import { OrgTeamsFilter } from "@calcom/features/insights/filters/OrgTeamsFilter";
import { useInsightsOrgTeams } from "@calcom/features/insights/hooks/useInsightsOrgTeams";
import { useLocale } from "@calcom/lib/hooks/useLocale";

export default function InsightsWorkflowPage({ timeZone }: { timeZone: string }) {
  return (
    <DataTableProvider timeZone={timeZone}>
      <InsightsOrgTeamsProvider>
        <InsightsWorkflowPageContent />
      </InsightsOrgTeamsProvider>
    </DataTableProvider>
  );
}

const createdAtColumn: Extract<FilterableColumn, { type: ColumnFilterType.DATE_RANGE }> = {
  id: "createdAt",
  title: "createdAt",
  type: ColumnFilterType.DATE_RANGE,
};

function InsightsWorkflowPageContent() {
  const { t } = useLocale();
  const { table } = useInsightsWorkflows();
  const { isAll, teamId, userId } = useInsightsOrgTeams();

  return (
    <>
      <div
        className="flex flex-wrap items-center gap-2"
        data-testid={`insights-filters-${isAll}-${teamId}-${userId}`}>
        <OrgTeamsFilter />
        <DataTableFilters.AddFilterButton table={table} hideWhenFilterApplied />
        <DataTableFilters.ActiveFilters table={table} />
        <DataTableFilters.AddFilterButton table={table} variant="sm" showWhenFilterApplied />
        <DataTableFilters.ClearFiltersButton exclude={["createdAt"]} />
        <div className="grow" />
        <Download />
        <DateRangeFilter column={createdAtColumn} />
      </div>
      <div className="mb-4 space-y-4">
        <WorkflowKPICards />
        <WorkflowStatusLineChart />
        <small className="text-default block text-center">
          {t("looking_for_more_insights")}{" "}
          <a
            className="text-blue-500 hover:underline"
            href="mailto:support@cal.id?subject=Feature%20Request%3A%20More%20Analytics&body=Hey%20Cal.id%20Team%2C%20I%20love%20the%20analytics%20page%20but%20I%20am%20looking%20for%20...">
            {" "}
            {t("contact_support")}
          </a>
        </small>
      </div>
    </>
  );
}
