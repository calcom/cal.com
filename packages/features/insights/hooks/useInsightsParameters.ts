import { useMemo } from "react";

import dayjs from "@calcom/dayjs";
import {
  useFilterValue,
  useColumnFilters,
  ZMultiSelectFilterValue,
  ZSingleSelectFilterValue,
  ZDateRangeFilterValue,
} from "@calcom/features/data-table";
import { useChangeTimeZoneWithPreservedLocalTime } from "@calcom/features/data-table/hooks/useChangeTimeZoneWithPreservedLocalTime";
import {
  getDefaultStartDate,
  getDefaultEndDate,
  CUSTOM_PRESET_VALUE,
  type PresetOptionValue,
} from "@calcom/features/data-table/lib/dateRange";

import { useInsightsOrgTeams } from "./useInsightsOrgTeams";

export function useInsightsParameters() {
  const { isAll, teamId, userId, scope, selectedTeamId } = useInsightsOrgTeams();

  const memberUserIds = useFilterValue("bookingUserId", ZMultiSelectFilterValue)?.data as
    | number[]
    | undefined;
  const memberUserId = useFilterValue("bookingUserId", ZSingleSelectFilterValue)?.data as number | undefined;
  const eventTypeId = useFilterValue("eventTypeId", ZSingleSelectFilterValue)?.data as number | undefined;
  const routingFormId = useFilterValue("formId", ZSingleSelectFilterValue)?.data as string | undefined;
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
    scope,
    selectedTeamId,
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
