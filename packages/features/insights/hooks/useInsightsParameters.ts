import { useMemo } from "react";

import dayjs from "@calcom/dayjs";
import {
  useFilterValue,
  useColumnFilters,
  ZMultiSelectFilterValue,
  ZSingleSelectFilterValue,
  ZDateRangeFilterValue,
} from "@calcom/features/data-table";

import { useInsightsOrgTeams } from "./useInsightsOrgTeams";

export function useInsightsParameters() {
  const { isAll, teamId, userId } = useInsightsOrgTeams();

  const memberUserIds = useFilterValue("bookingUserId", ZMultiSelectFilterValue)?.data as
    | number[]
    | undefined;
  const routingFormId = useFilterValue("formId", ZSingleSelectFilterValue)?.data as string | undefined;
  const createdAtRange = useFilterValue("createdAt", ZDateRangeFilterValue)?.data;
  const startDate = useMemo(
    () => createdAtRange?.startDate ?? dayjs().subtract(1, "week").startOf("day").toISOString(),
    [createdAtRange?.startDate]
  );
  const endDate = useMemo(
    () => createdAtRange?.endDate ?? dayjs().endOf("day").toISOString(),
    [createdAtRange?.endDate]
  );
  const columnFilters = useColumnFilters({ exclude: ["bookingUserId", "formId", "createdAt"] });

  return {
    isAll,
    teamId,
    userId,
    memberUserIds,
    routingFormId,
    startDate,
    endDate,
    columnFilters,
  };
}
