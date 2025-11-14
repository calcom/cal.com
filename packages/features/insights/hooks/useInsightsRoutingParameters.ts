import { useMemo } from "react";

import dayjs from "@calcom/dayjs";
import { useFilterValue, useColumnFilters, ZDateRangeFilterValue } from "@calcom/features/data-table";
import { getDefaultStartDate, getDefaultEndDate } from "@calcom/features/data-table/lib/dateRange";

import { useInsightsOrgTeams } from "./useInsightsOrgTeams";

export function useInsightsRoutingParameters() {
  const { scope, selectedTeamId } = useInsightsOrgTeams();

  const createdAtRange = useFilterValue("createdAt", ZDateRangeFilterValue)?.data;

  const startDate = useMemo(() => {
    return dayjs(createdAtRange?.startDate ?? getDefaultStartDate().toISOString())
      .startOf("day")
      .toISOString();
  }, [createdAtRange?.startDate]);

  const endDate = useMemo(() => {
    return dayjs(createdAtRange?.endDate ?? getDefaultEndDate().toISOString())
      .endOf("day")
      .toISOString();
  }, [createdAtRange?.endDate]);

  const columnFilters = useColumnFilters({
    exclude: ["createdAt"],
  });

  return {
    scope,
    selectedTeamId,
    startDate,
    endDate,
    columnFilters,
  };
}
