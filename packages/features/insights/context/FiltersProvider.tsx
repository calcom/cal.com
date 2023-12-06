import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";

import dayjs from "@calcom/dayjs";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { trpc } from "@calcom/trpc";

import type { FilterContextType } from "./provider";
import { FilterProvider } from "./provider";

const querySchema = z.object({
  startTime: z.string().nullable(),
  endTime: z.string().nullable(),
  teamId: z.coerce.number().nullable(),
  userId: z.coerce.number().nullable(),
  memberUserId: z.coerce.number().nullable(),
  eventTypeId: z.coerce.number().nullable(),
  filter: z.enum(["event-type", "user"]).nullable(),
});

export function FiltersProvider({ children }: { children: React.ReactNode }) {
  // searchParams to get initial values from query params
  const utils = trpc.useContext();
  const searchParams = useCompatSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  let startTimeParsed,
    endTimeParsed,
    teamIdParsed: number | undefined | null,
    userIdParsed,
    eventTypeIdParsed,
    filterParsed,
    memberUserIdParsed;

  const safe = querySchema.safeParse({
    startTime: searchParams?.get("startTime") ?? null,
    endTime: searchParams?.get("endTime") ?? null,
    teamId: searchParams?.get("teamId") ?? null,
    userId: searchParams?.get("userId") ?? null,
    eventTypeId: searchParams?.get("eventTypeId") ?? null,
    filter: searchParams?.get("filter") ?? null,
    memberUserId: searchParams?.get("memberUserId") ?? null,
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
      isAll: null,
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
          utils.viewer.insights.rawData.invalidate();
          const {
            selectedMemberUserId,
            selectedTeamId,
            selectedUserId,
            selectedEventTypeId,
            selectedFilter,
            isAll,
            dateRange,
            initialConfig,
          } = newConfigFilters;
          const [startTime, endTime] = dateRange || [null, null];
          const newSearchParams = new URLSearchParams(searchParams?.toString() ?? undefined);
          function setParamsIfDefined(key: string, value: string | number | boolean | null | undefined) {
            if (value !== undefined && value !== null) newSearchParams.set(key, value.toString());
          }

          setParamsIfDefined("memberUserId", selectedMemberUserId);
          setParamsIfDefined("teamId", selectedTeamId || initialConfig?.teamId);
          setParamsIfDefined("userId", selectedUserId || initialConfig?.userId);
          setParamsIfDefined("eventTypeId", selectedEventTypeId);
          setParamsIfDefined("isAll", isAll || initialConfig?.isAll);
          setParamsIfDefined("startTime", startTime?.toISOString());
          setParamsIfDefined("endTime", endTime?.toISOString());
          setParamsIfDefined("filter", selectedFilter?.[0]);
          router.push(`${pathname}?${newSearchParams.toString()}`);
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

          const newSearchParams = new URLSearchParams();
          if (teamId) newSearchParams.set("teamId", teamId.toString());
          if (userId) newSearchParams.set("userId", userId.toString());

          router.push(`${pathname}?${newSearchParams.toString()}`);
        },
      }}>
      {children}
    </FilterProvider>
  );
}
