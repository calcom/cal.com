import { useRouter } from "next/router";
import { useState } from "react";
import { z } from "zod";

import dayjs from "@calcom/dayjs";

import type { FilterContextType } from "./provider";
import { FilterProvider } from "./provider";

export function FiltersProvider({ children }: { children: React.ReactNode }) {
  // useRouter to get initial values from query params
  const router = useRouter();
  const { startTime, endTime, teamId, userId, eventTypeId, filter, memberUserId } = router.query;
  const querySchema = z.object({
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    teamId: z.coerce.number().optional(),
    userId: z.coerce.number().optional(),
    memberUserId: z.coerce.number().optional(),
    eventTypeId: z.coerce.number().optional(),
    filter: z.enum(["event-type", "user"]).optional(),
  });

  let startTimeParsed,
    endTimeParsed,
    teamIdParsed: number | undefined,
    userIdParsed,
    eventTypeIdParsed,
    filterParsed,
    memberUserIdParsed;

  const safe = querySchema.safeParse({
    startTime,
    endTime,
    teamId,
    userId,
    eventTypeId,
    filter,
    memberUserId,
  });

  if (!safe.success) {
    console.error("Failed to parse query params");
  } else {
    startTimeParsed = safe.data.startTime;
    endTimeParsed = safe.data.endTime;
    teamIdParsed = safe.data.teamId;
    userIdParsed = safe.data.userId;
    eventTypeIdParsed = safe.data.eventTypeId;
    filterParsed = safe.data.filter;
    memberUserIdParsed = safe.data.memberUserId;
  }

  const [configFilters, setConfigFilters] = useState<FilterContextType["filter"]>({
    dateRange: [
      startTimeParsed ? dayjs(startTimeParsed) : dayjs().subtract(1, "month"),
      endTimeParsed ? dayjs(endTimeParsed) : dayjs(),
      "t",
    ],
    selectedTimeView: "week",
    selectedUserId: userIdParsed || null,
    selectedMemberUserId: memberUserIdParsed || null,
    selectedTeamId: teamIdParsed || null,
    selectedTeamName: null,
    selectedEventTypeId: eventTypeIdParsed || null,
    selectedFilter: filterParsed ? [filterParsed] : null,
    isAll: false,
    initialConfig: {
      userId: null,
      teamId: null,
      isAll: false,
    },
  });

  const {
    dateRange,
    selectedTimeView,
    selectedMemberUserId,
    selectedTeamId,
    selectedUserId,
    selectedEventTypeId,
    selectedFilter,
    selectedTeamName,
    isAll,
    initialConfig,
  } = configFilters;
  return (
    <FilterProvider
      value={{
        filter: {
          dateRange,
          selectedTimeView,
          selectedMemberUserId,
          selectedTeamId,
          selectedUserId,
          selectedTeamName,
          selectedEventTypeId,
          selectedFilter,
          isAll,
          initialConfig,
        },
        setConfigFilters: (newConfigFilters) => {
          setConfigFilters({
            ...configFilters,
            ...newConfigFilters,
          });

          const {
            selectedMemberUserId,
            selectedTeamId,
            selectedUserId,
            selectedEventTypeId,
            selectedFilter,
            isAll,
            dateRange,
          } = newConfigFilters;
          const [startTime, endTime] = dateRange || [null, null];

          const mergedQueryParams = {
            ...(router.query || {}),
            ...(selectedMemberUserId !== undefined && { memberUserId: selectedMemberUserId }),
            ...(selectedTeamId !== undefined && { teamId: selectedTeamId }),
            ...(selectedUserId !== undefined && { userId: selectedUserId }),
            ...(selectedEventTypeId !== undefined && { eventTypeId: selectedEventTypeId }),
            ...(selectedFilter !== undefined &&
              selectedFilter &&
              selectedFilter?.length > 0 && { filter: selectedFilter[0] }),
            ...(isAll !== undefined && { isAll }),
            ...(startTime !== undefined && startTime && { startTime: startTime.toISOString() }),
            ...(endTime !== undefined && endTime && { endTime: endTime.toISOString() }),
          };

          router.push({
            query: mergedQueryParams,
          });
        },
        clearFilters: () => {
          const { initialConfig } = configFilters;

          const teamId = initialConfig?.teamId ? initialConfig.teamId : undefined;
          const userId = initialConfig?.userId ? initialConfig.userId : undefined;
          setConfigFilters({
            selectedEventTypeId: null,
            selectedFilter: null,
            selectedMemberUserId: null,
            selectedTeamId: teamId,
            selectedTeamName: null,
            selectedTimeView: "week",
            selectedUserId: userId,
            isAll: !!initialConfig?.isAll,
            dateRange: [dayjs().subtract(1, "month"), dayjs(), "t"],
            initialConfig,
          });

          router.push({
            query: {
              ...(teamId && { teamId: teamId }),
              ...(userId && { userId: userId }),
            },
          });
        },
      }}>
      {children}
    </FilterProvider>
  );
}
