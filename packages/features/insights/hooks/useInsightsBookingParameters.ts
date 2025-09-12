import { useColumnFilters } from "@calcom/features/data-table/hooks/useColumnFilters";
import { useDataTable } from "@calcom/features/data-table/hooks/useDataTable";
import { CURRENT_TIMEZONE } from "@calcom/lib/timezoneConstants";

import { useInsightsOrgTeams } from "./useInsightsOrgTeams";

export function useInsightsBookingParameters() {
  const { timeZone } = useDataTable();
  const { scope, selectedTeamId } = useInsightsOrgTeams();
  const columnFilters = useColumnFilters();

  return {
    scope,
    selectedTeamId,
    timeZone: timeZone || CURRENT_TIMEZONE,
    columnFilters,
  };
}
