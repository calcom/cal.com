import { useMemo } from "react";

import dayjs from "@calcom/dayjs";
import { useColumnFilters } from "@calcom/features/data-table/hooks/useColumnFilters";
import { useDataTable } from "@calcom/features/data-table/hooks/useDataTable";
import {
  getDefaultStartDate,
  getDefaultEndDate,
  DEFAULT_PRESET,
} from "@calcom/features/data-table/lib/dateRange";
import { ColumnFilterType, type ColumnFilter } from "@calcom/features/data-table/lib/types";
import { CURRENT_TIMEZONE } from "@calcom/lib/timezoneConstants";

import { useInsightsOrgTeams } from "./useInsightsOrgTeams";

export function useInsightsBookingParameters() {
  const { scope, selectedTeamId } = useInsightsOrgTeams();
  const { timeZone } = useDataTable();
  const columnFilters = useColumnFilters();
  const columnFiltersWithDefaultDateRange = useMemo(() => {
    const hasDateRangeFilter = columnFilters.find(
      (filter) => filter.id === "startTime" || filter.id === "createdAt"
    );
    if (hasDateRangeFilter) {
      return columnFilters;
    } else {
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
    }
  }, [columnFilters]);

  return {
    scope,
    selectedTeamId,
    timeZone: timeZone || CURRENT_TIMEZONE,
    columnFilters: columnFiltersWithDefaultDateRange,
  };
}
