import { useMemo } from "react";

import dayjs from "@calcom/dayjs";
import { ZDateRangeFilterValue } from "@calcom/features/data-table";
import { useChangeTimeZoneWithPreservedLocalTime } from "@calcom/features/data-table/hooks/useChangeTimeZoneWithPreservedLocalTime";
import { useColumnFilters } from "@calcom/features/data-table/hooks/useColumnFilters";
import { useDataTable } from "@calcom/features/data-table/hooks/useDataTable";
import { useFilterValue } from "@calcom/features/data-table/hooks/useFilterValue";
import { getDefaultStartDate, getDefaultEndDate } from "@calcom/features/data-table/lib/dateRange";
import { CURRENT_TIMEZONE } from "@calcom/lib/timezoneConstants";

import { useInsightsOrgTeams } from "./useInsightsOrgTeams";

export function useInsightsBookingParameters() {
  const { scope, selectedTeamId } = useInsightsOrgTeams();
  const { timeZone } = useDataTable();

  const createdAtRange = useFilterValue("createdAt", ZDateRangeFilterValue)?.data;
  // TODO for future: this preserving local time & startOf & endOf should be handled
  // from DateRangeFilter out of the box.
  // When we do it, we also need to remove those timezone handling logic from the backend side at the same time.
  const startDate = useChangeTimeZoneWithPreservedLocalTime(
    useMemo(() => {
      return dayjs(createdAtRange?.startDate ?? getDefaultStartDate().toISOString())
        .startOf("day")
        .toISOString();
    }, [createdAtRange?.startDate])
  );
  const endDate = useChangeTimeZoneWithPreservedLocalTime(
    useMemo(() => {
      return dayjs(createdAtRange?.endDate ?? getDefaultEndDate().toISOString())
        .endOf("day")
        .toISOString();
    }, [createdAtRange?.endDate])
  );
  const columnFilters = useColumnFilters({ exclude: ["createdAt"] });

  return {
    scope,
    selectedTeamId,
    startDate,
    endDate,
    timeZone: timeZone || CURRENT_TIMEZONE,
    columnFilters,
  };
}
