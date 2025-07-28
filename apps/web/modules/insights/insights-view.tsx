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
  EventTrendsChart,
  HighestNoShowHostTable,
  HighestRatedMembersTable,
  BookingsByHourChart,
  LeastBookedTeamMembersTable,
  LowestRatedMembersTable,
  MostBookedTeamMembersTable,
  MostCancelledBookingsTables,
  PopularEventsTable,
  RecentFeedbackTable,
  TimezoneBadge,
} from "@calcom/features/insights/components";
import "@calcom/features/insights/components/tremor.css";
import { InsightsOrgTeamsProvider } from "@calcom/features/insights/context/InsightsOrgTeamsProvider";
import { Download } from "@calcom/features/insights/filters/Download";
import { OrgTeamsFilter } from "@calcom/features/insights/filters/OrgTeamsFilter";
import { useInsightsBookings } from "@calcom/features/insights/hooks/useInsightsBookings";
import { useInsightsOrgTeams } from "@calcom/features/insights/hooks/useInsightsOrgTeams";
import { useLocale } from "@calcom/lib/hooks/useLocale";

export default function InsightsPage({ timeZone }: { timeZone: string }) {
  return (
    <DataTableProvider timeZone={timeZone}>
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
        <BookingKPICards />

        <EventTrendsChart />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
          <div className="sm:col-span-2">
            <BookingsByHourChart />
          </div>
          <div className="sm:col-span-2">
            <AverageEventDurationChart />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
          <div className="sm:col-span-2">
            <PopularEventsTable />
          </div>
          <MostBookedTeamMembersTable />
          <LeastBookedTeamMembersTable />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
          <MostCancelledBookingsTables />
          <HighestNoShowHostTable />
          <HighestRatedMembersTable />
          <LowestRatedMembersTable />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
          <div className="sm:col-span-2">
            <RecentFeedbackTable />
          </div>
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
