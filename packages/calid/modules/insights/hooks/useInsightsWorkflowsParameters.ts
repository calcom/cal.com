import { useMemo } from "react";

import dayjs from "@calcom/dayjs";
import { ZSingleSelectFilterValue, ZDateRangeFilterValue } from "@calcom/features/data-table";
import { useChangeTimeZoneWithPreservedLocalTime } from "@calcom/features/data-table/hooks/useChangeTimeZoneWithPreservedLocalTime";
import { useDataTable } from "@calcom/features/data-table/hooks/useDataTable";
import { useFilterValue } from "@calcom/features/data-table/hooks/useFilterValue";
import { getDefaultStartDate, getDefaultEndDate } from "@calcom/features/data-table/lib/dateRange";
import { useInsightsOrgTeams } from "@calcom/features/insights/hooks/useInsightsOrgTeams";
import { CURRENT_TIMEZONE } from "@calcom/lib/timezoneConstants";
import type { WorkflowMethods } from "@calcom/prisma/enums";

export function useInsightsWorkflowsParameters() {
  const { userId, teamId, scope, selectedTeamId } = useInsightsOrgTeams();
  const { timeZone } = useDataTable();

  const eventTypeId = useFilterValue("eventTypeId", ZSingleSelectFilterValue)?.data as number | undefined;
  const type = useFilterValue("workflowType", ZSingleSelectFilterValue)?.data as WorkflowMethods | undefined;
  const createdAtRange = useFilterValue("createdAt", ZDateRangeFilterValue)?.data;

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

  return {
    userId,
    teamId,
    scope,
    selectedTeamId,
    startDate,
    endDate,
    timeZone: timeZone || CURRENT_TIMEZONE,
    eventTypeId,
    type,
  };
}
