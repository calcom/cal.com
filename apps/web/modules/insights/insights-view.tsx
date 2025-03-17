"use client";

import {
  DataTableProvider,
  DataTableFilters,
  DateRangeFilter,
  ColumnFilterType,
  type FilterableColumn,
} from "@calcom/features/data-table";
import {
  AverageEventDurationChart,
  BookingKPICards,
  BookingStatusLineChart,
  LeastBookedTeamMembersTable,
  MostBookedTeamMembersTable,
  PopularEventsTable,
  HighestNoShowHostTable,
  RecentFeedbackTable,
  HighestRatedMembersTable,
  LowestRatedMembersTable,
} from "@calcom/features/insights/components";
import "@calcom/features/insights/components/tremor.css";
import { InsightsOrgTeamsProvider } from "@calcom/features/insights/context/InsightsOrgTeamsProvider";
import { Download } from "@calcom/features/insights/filters/Download";
import { OrgTeamsFilter } from "@calcom/features/insights/filters/OrgTeamsFilter";
import { useInsightsBookings } from "@calcom/features/insights/hooks/useInsightsBookings";
import { useInsightsOrgTeams } from "@calcom/features/insights/hooks/useInsightsOrgTeams";
import { useLocale } from "@calcom/lib/hooks/useLocale";

export default function InsightsPage() {
  return (
    <DataTableProvider>
      <InsightsOrgTeamsProvider>
        <InsightsPageContent />
      </InsightsOrgTeamsProvider>
    </DataTableProvider>
  );
}

const createdAtColumn: Extract<FilterableColumn, { type: ColumnFilterType.DATE_RANGE }> = {
  id: "createdAt",
  title: "createdAt",
  type: ColumnFilterType.DATE_RANGE,
};

function InsightsPageContent() {
  const { t } = useLocale();
  const { table } = useInsightsBookings();
  const { isAll, teamId, userId } = useInsightsOrgTeams();

  return (
    <>
      <div
        className="flex flex-wrap items-center gap-2"
        data-testid={`insights-filters-${isAll}-${teamId}-${userId}`}>
        <OrgTeamsFilter />
        <DataTableFilters.AddFilterButton table={table} />
        <DataTableFilters.ActiveFilters table={table} />
        <DataTableFilters.ClearFiltersButton exclude={["createdAt"]} />
        <div className="grow" />
        <Download />
        <DateRangeFilter column={createdAtColumn} />
      </div>

      <div className="my-4 space-y-4">
        <BookingKPICards />

        <BookingStatusLineChart />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <PopularEventsTable />
          <AverageEventDurationChart />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <MostBookedTeamMembersTable />
          <LeastBookedTeamMembersTable />
        </div>
        <RecentFeedbackTable />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <HighestNoShowHostTable />
          <HighestRatedMembersTable />
          <LowestRatedMembersTable />
        </div>
        <small className="text-default block text-center">
          {t("looking_for_more_insights")}{" "}
          <a
            className="text-blue-500 hover:underline"
            href="mailto:updates@cal.com?subject=Feature%20Request%3A%20More%20Analytics&body=Hey%20Cal.com%20Team%2C%20I%20love%20the%20analytics%20page%20but%20I%20am%20looking%20for%20...">
            {" "}
            {t("contact_support")}
          </a>
        </small>
      </div>
    </>
  );
}
