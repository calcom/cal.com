import { useMemo } from "react";

import {
  useFilterValue,
  useColumnFilters,
  ZMultiSelectFilterValue,
  ZSingleSelectFilterValue,
  ZDateRangeFilterValue,
} from "@calcom/features/data-table";
import {
  getDefaultStartDate,
  getDefaultEndDate,
  CUSTOM_PRESET_VALUE,
  type PresetOptionValue,
} from "@calcom/features/data-table/lib/dateRange";

import { useInsightsOrgTeams } from "./useInsightsOrgTeams";

export function useInsightsParameters() {
  const { isAll, teamId, userId } = useInsightsOrgTeams();

  const memberUserIds = useFilterValue("bookingUserId", ZMultiSelectFilterValue)?.data as
    | number[]
    | undefined;
  const memberUserId = useFilterValue("bookingUserId", ZSingleSelectFilterValue)?.data as number | undefined;
  const eventTypeId = useFilterValue("eventTypeId", ZSingleSelectFilterValue)?.data as number | undefined;
  const routingFormId = useFilterValue("formId", ZSingleSelectFilterValue)?.data as string | undefined;
  const createdAtRange = useFilterValue("createdAt", ZDateRangeFilterValue)?.data;
  const startDate = useMemo(
    () => createdAtRange?.startDate ?? getDefaultStartDate().toISOString(),
    [createdAtRange?.startDate]
  );
  const endDate = useMemo(
    () => createdAtRange?.endDate ?? getDefaultEndDate().toISOString(),
    [createdAtRange?.endDate]
  );
  const dateRangePreset = useMemo<PresetOptionValue>(() => {
    return (createdAtRange?.preset as PresetOptionValue) ?? CUSTOM_PRESET_VALUE;
  }, [createdAtRange?.preset]);

  const columnFilters = useColumnFilters({
    exclude: ["bookingUserId", "formId", "createdAt", "eventTypeId"],
  });

  return {
    isAll,
    teamId,
    userId,
    memberUserIds,
    memberUserId,
    eventTypeId,
    routingFormId,
    startDate,
    endDate,
    dateRangePreset,
    columnFilters,
  };
}
