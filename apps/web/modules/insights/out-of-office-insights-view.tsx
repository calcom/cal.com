"use client";

import {
  DataTableProvider,
  DataTableFilters,
  DateRangeFilter,
  ColumnFilterType,
  type FilterableColumn,
} from "@calcom/features/data-table";
import { TimezoneBadge } from "@calcom/features/insights/components/booking";
import {
  OutOfOfficeTrendsChart,
  MostOutOfOfficeTeamMembersTable,
  LeastOutOfOfficeTeamMembersTable,
} from "@calcom/features/insights/components/out-of-office";
import { InsightsOrgTeamsProvider } from "@calcom/features/insights/context/InsightsOrgTeamsProvider";
import { Download } from "@calcom/features/insights/filters/Download";
import { OrgTeamsFilter } from "@calcom/features/insights/filters/OrgTeamsFilter";
import { useInsightsBookings } from "@calcom/features/insights/hooks/useInsightsBookings";
import { useInsightsOrgTeams } from "@calcom/features/insights/hooks/useInsightsOrgTeams";
import { useLocale } from "@calcom/lib/hooks/useLocale";

export default function OutOfOfficeInsightsPage({ timeZone }: { timeZone: string }) {
  return (
    <DataTableProvider timeZone={timeZone}>
      <InsightsOrgTeamsProvider>
        <OutOfOfficeInsightsPageContent />
      </InsightsOrgTeamsProvider>
    </DataTableProvider>
  );
}

const createdAtColumn: Extract<FilterableColumn, { type: ColumnFilterType.DATE_RANGE }> = {
  id: "createdAt",
  title: "createdAt",
  type: ColumnFilterType.DATE_RANGE,
};

function OutOfOfficeInsightsPageContent() {
  const { t } = useLocale();
  const { table } = useInsightsBookings();
  const { isAll, teamId, userId } = useInsightsOrgTeams();

  return (
    <>
      <div
        className="flex flex-wrap items-center gap-2"
        data-testid={`out-of-office-insights-filters-${isAll}-${teamId}-${userId}`}>
        <OrgTeamsFilter />
        <DataTableFilters.AddFilterButton table={table} hideWhenFilterApplied />
        <DataTableFilters.ActiveFilters table={table} />
        <DataTableFilters.AddFilterButton table={table} variant="sm" showWhenFilterApplied />
        <DataTableFilters.ClearFiltersButton exclude={["createdAt"]} />
        <div className="grow" />
        <Download />
        <DateRangeFilter column={createdAtColumn} />
        <TimezoneBadge />
      </div>

      <div className="my-4 space-y-4">
        <OutOfOfficeTrendsChart />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
          <MostOutOfOfficeTeamMembersTable />
          <LeastOutOfOfficeTeamMembersTable />
        </div>

        <small className="text-default block text-center">
          {t("looking_for_more_insights")}{" "}
          <a
            className="text-blue-500 hover:underline"
            href="mailto:updates@cal.com?subject=Feature%20Request%3A%20More%20Analytics&amp;body=Hey%20Cal.com%20Team%2C%20I%20love%20the%20analytics%20page%20but%20I%20am%20looking%20for%20...">
            {" "}
            {t("contact_support")}
          </a>
        </small>
      </div>
    </>
  );
}
