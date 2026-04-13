import { useMemo } from "react";

import dayjs from "@calcom/dayjs";
import { useColumnFilters } from "~/data-table/hooks/useColumnFilters";
import { useDataTable } from "~/data-table/hooks/useDataTable";
import {
  getDefaultStartDate,
  getDefaultEndDate,
  DEFAULT_PRESET,
} from "@calcom/features/data-table/lib/dateRange";
import { ColumnFilterType, type ColumnFilter } from "@calcom/features/data-table/lib/types";
import { CURRENT_TIMEZONE } from "@calcom/lib/timezoneConstants";

import { useInsightsOrgTeams } from "./useInsightsOrgTeams";

export function useInsightsBookingParameters() {
  const { scope, selectedTeamId, isSessionReady } = useInsightsOrgTeams();
  const { timeZone } = useDataTable();
  const columnFilters = useColumnFilters();

  const hasDateRangeFilter = useMemo(
    () => columnFilters.some((filter) => filter.id === "startTime" || filter.id === "createdAt"),
    [columnFilters]
  );

  const columnFiltersWithDefaultDateRange = useMemo(() => {
    if (hasDateRangeFilter) {
      return columnFilters;
    }
    return [
      ...columnFilters,
      {
        id: "startTime",
        value: {
          type: ColumnFilterType.DATE_RANGE,
          data: {
            startDate: dayjs(getDefaultStartDate().toISOString()).startOf("day").toISOString(),
            endDate: dayjs(getDefaultEndDate().toISOString()).endOf("day").toISOString(),
            preset: DEFAULT_PRESET.value,
          },
        },
      } satisfies ColumnFilter,
    ];
  }, [columnFilters, hasDateRangeFilter]);

  // Queries should wait until:
  // 1. Session is authenticated so scope is correct (orgTeamsType is derived from session)
  // 2. DateRangeFilter has set timezone-converted dates (won't re-fetch with different dates)
  const isReady = isSessionReady && hasDateRangeFilter;

  return {
    scope,
    selectedTeamId,
    timeZone: timeZone || CURRENT_TIMEZONE,
    columnFilters: columnFiltersWithDefaultDateRange,
    isReady,
  };
}
