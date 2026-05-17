import dayjs from "@calcom/dayjs";
import { useColumnFilters, useFilterValue, ZDateRangeFilterValue } from "@calcom/features/data-table";
import { getDefaultEndDate, getDefaultStartDate } from "@calcom/features/data-table/lib/dateRange";
import { useMemo } from "react";
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
