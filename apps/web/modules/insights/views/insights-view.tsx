"use client";

import { usePathname } from "next/navigation";
import { useState, useCallback } from "react";

import { DataTableProvider, ColumnFilterType, type FilterableColumn } from "@calcom/features/data-table";
import { DataTableFilters, DateRangeFilter } from "~/data-table/components";
import type { FilterType } from "@calcom/types/data-table";
import { useDataTable } from "@calcom/features/data-table/hooks/useDataTable";
import { useSegments } from "@calcom/features/data-table/hooks/useSegments";
import {
  AverageEventDurationChart,
  BookingKPICards,
  BookingsByHourChart,
  CSATOverTimeChart,
  EventTrendsChart,
  HighestNoShowHostTable,
  HighestRatedMembersTable,
  LeastBookedTeamMembersTable,
  LowestRatedMembersTable,
  MostBookedTeamMembersTable,
  MostCancelledBookingsTables,
  MostCompletedTeamMembersTable,
  LeastCompletedTeamMembersTable,
  NoShowHostsOverTimeChart,
  PopularEventsTable,
  RecentNoShowGuestsChart,
  RecentFeedbackTable,
  TimezoneBadge,
} from "@calcom/web/modules/insights/components/booking";
import { InsightsOrgTeamsProvider } from "../components/context/InsightsOrgTeamsProvider";
import { DateTargetSelector, type DateTarget } from "../components/filters/DateTargetSelector";
import { Download } from "../components/filters/Download/Download";
import { OrgTeamsFilter } from "../components/filters/OrgTeamsFilter";
import { useInsightsBookings } from "@calcom/web/modules/insights/hooks/useInsightsBookings";
import { useInsightsOrgTeams } from "@calcom/web/modules/insights/hooks/useInsightsOrgTeams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { ButtonGroup } from "@calcom/ui/components/buttonGroup";

export default function InsightsPage({ timeZone }: { timeZone: string }) {
  const pathname = usePathname();
  if (!pathname) return null;
  return (
    <DataTableProvider tableIdentifier={pathname} useSegments={useSegments} timeZone={timeZone}>
      <InsightsOrgTeamsProvider>
        <InsightsPageContent />
      </InsightsOrgTeamsProvider>
    </DataTableProvider>
  );
}

const createdAtColumn: Extract<FilterableColumn, { type: Extract<FilterType, "dr"> }> = {
  id: "createdAt",
  title: "createdAt",
  type: ColumnFilterType.DATE_RANGE,
};

const startTimeColumn: Extract<FilterableColumn, { type: Extract<FilterType, "dr"> }> = {
  id: "startTime",
  title: "startTime",
  type: ColumnFilterType.DATE_RANGE,
};

function InsightsPageContent() {
  const { t } = useLocale();
  const { table } = useInsightsBookings();
  const { isAll, teamId, userId } = useInsightsOrgTeams();
  const { removeFilter } = useDataTable();
  const [dateTarget, _setDateTarget] = useState<"startTime" | "createdAt">("startTime");

  const setDateTarget = useCallback(
    (target: "startTime" | "createdAt") => {
      _setDateTarget(target);
      removeFilter(target === "startTime" ? "createdAt" : "startTime");
    },
    [_setDateTarget, removeFilter]
  );

  return (
    <>
      <div
        className="flex flex-wrap items-center gap-2"
        data-testid={`insights-filters-${isAll}-${teamId}-${userId}`}>
        <OrgTeamsFilter />
        <DataTableFilters.FilterBar table={table} />
        <DataTableFilters.ClearFiltersButton exclude={["startTime", "createdAt"]} />
        <div className="grow" />
        <Download />
        <ButtonGroup combined>
          <DateRangeFilter
            column={dateTarget === "startTime" ? startTimeColumn : createdAtColumn}
            options={{ convertToTimeZone: true }}
          />
          <DateTargetSelector value={dateTarget as DateTarget} onChange={setDateTarget} />
        </ButtonGroup>
        <TimezoneBadge />
      </div>

      <div className="my-4 stack-y-4">
        <BookingKPICards />

        <EventTrendsChart />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <NoShowHostsOverTimeChart />
          <CSATOverTimeChart />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
          <div className="sm:col-span-2">
            <BookingsByHourChart />
          </div>
          <div className="sm:col-span-2">
            <AverageEventDurationChart />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
          <MostBookedTeamMembersTable />
          <LeastBookedTeamMembersTable />
          <MostCompletedTeamMembersTable />
          <LeastCompletedTeamMembersTable />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
          <MostCancelledBookingsTables />
          <HighestNoShowHostTable />
          <div className="sm:col-span-2">
            <RecentNoShowGuestsChart />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
          <HighestRatedMembersTable />
          <LowestRatedMembersTable />
          <div className="sm:col-span-2">
            <RecentFeedbackTable />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
          <div className="sm:col-span-2">
            <PopularEventsTable />
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
