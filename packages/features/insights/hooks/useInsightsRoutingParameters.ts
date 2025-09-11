import { useMemo } from "react";

import dayjs from "@calcom/dayjs";
import { useFilterValue, useColumnFilters, ZDateRangeFilterValue } from "@calcom/features/data-table";
import { useChangeTimeZoneWithPreservedLocalTime } from "@calcom/features/data-table/hooks/useChangeTimeZoneWithPreservedLocalTime";
import { getDefaultStartDate, getDefaultEndDate } from "@calcom/features/data-table/lib/dateRange";

import { useInsightsOrgTeams } from "./useInsightsOrgTeams";

export function useInsightsRoutingParameters() {
  const { scope, selectedTeamId } = useInsightsOrgTeams();

  const timestampRange = useFilterValue("timestamp", ZDateRangeFilterValue)?.data;
  // TODO for future: this preserving local time & startOf & endOf should be handled
  // from DateRangeFilter out of the box.
  // When we do it, we also need to remove those timezone handling logic from the backend side at the same time.
  const startDate = useChangeTimeZoneWithPreservedLocalTime(
    useMemo(() => {
      return dayjs(timestampRange?.startDate ?? getDefaultStartDate().toISOString())
        .startOf("day")
        .toISOString();
    }, [timestampRange?.startDate])
  );
  const endDate = useChangeTimeZoneWithPreservedLocalTime(
    useMemo(() => {
      return dayjs(timestampRange?.endDate ?? getDefaultEndDate().toISOString())
        .endOf("day")
        .toISOString();
    }, [timestampRange?.endDate])
  );

  const columnFilters = useColumnFilters({
    exclude: ["timestamp"],
  });

  return {
    scope,
    selectedTeamId,
    startDate,
    endDate,
    columnFilters,
  };
}
