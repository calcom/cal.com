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

  // TODO: Sync insight filters with URL parameters
  const [selectedTimeView, setSelectedTimeView] =
    useState<FilterContextType["filter"]["selectedTimeView"]>("week");
  const [selectedUserId, setSelectedUserId] = useState<FilterContextType["filter"]["selectedUserId"]>(
    userIdParsed || null
  );
  const [selectedMemberUserId, setSelectedMemberUserId] = useState<
    FilterContextType["filter"]["selectedMemberUserId"]
  >(memberUserIdParsed || null);
  const [selectedTeamId, setSelectedTeamId] = useState<FilterContextType["filter"]["selectedTeamId"]>(
    teamIdParsed || null
  );
  const [selectedEventTypeId, setSelectedEventTypeId] = useState<
    FilterContextType["filter"]["selectedEventTypeId"]
  >(eventTypeIdParsed || null);
  const [selectedFilter, setSelectedFilter] = useState<FilterContextType["filter"]["selectedFilter"]>(
    filterParsed ? [filterParsed] : null
  );
  const [selectedTeamName, setSelectedTeamName] =
    useState<FilterContextType["filter"]["selectedTeamName"]>(null);
  const [dateRange, setDateRange] = useState<FilterContextType["filter"]["dateRange"]>([
    startTimeParsed ? dayjs(startTimeParsed) : dayjs().subtract(1, "month"),
    endTimeParsed ? dayjs(endTimeParsed) : dayjs(),
    "t",
  ]);

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
        },
        setSelectedFilter: (filter) => {
          setSelectedFilter(filter);
          const userId =
            filter?.[0] === "user" ? selectedMemberUserId : selectedUserId ? selectedUserId : undefined;
          const eventTypeId = filter?.[0] === "event-type" ? selectedEventTypeId : undefined;
          router.push({
            query: {
              ...router.query,
              filter: filter?.[0],
              userId,
              eventTypeId,
            },
          });
        },
        setDateRange: (dateRange) => {
          setDateRange(dateRange);
          router.push({
            query: {
              ...router.query,
              startTime: dateRange[0].toISOString(),
              endTime: dateRange[1].toISOString(),
            },
          });
        },
        setSelectedTimeView: (selectedTimeView) => setSelectedTimeView(selectedTimeView),
        setSelectedMemberUserId: (selectedMemberUserId) => {
          setSelectedMemberUserId(selectedMemberUserId);
          const { userId, eventTypeId, ...rest } = router.query;
          router.push({
            query: {
              ...rest,
              memberUserId: selectedMemberUserId,
            },
          });
        },
        setSelectedTeamId: (selectedTeamId) => {
          setSelectedTeamId(selectedTeamId);
          setSelectedUserId(null);
          setSelectedMemberUserId(null);
          setSelectedEventTypeId(null);
          const { teamId, eventTypeId, memberUserId, ...rest } = router.query;
          router.push({
            query: {
              ...rest,
              teamId: selectedTeamId,
            },
          });
        },
        setSelectedUserId: (selectedUserId) => {
          setSelectedUserId(selectedUserId);
          setSelectedTeamId(null);
          setSelectedTeamName(null);
          setSelectedEventTypeId(null);
          const { teamId, eventTypeId, memberUserId, ...rest } = router.query;
          router.push({
            query: {
              ...rest,
              userId: selectedUserId,
            },
          });
        },
        setSelectedTeamName: (selectedTeamName) => setSelectedTeamName(selectedTeamName),
        setSelectedEventTypeId: (selectedEventTypeId) => {
          setSelectedEventTypeId(selectedEventTypeId);
          router.push({
            query: {
              ...router.query,
              eventTypeId: selectedEventTypeId,
            },
          });
        },
        clearFilters: () => {
          setSelectedTeamName(null);
          setSelectedEventTypeId(null);
          setSelectedMemberUserId(null);
          setSelectedFilter(null);
          const { teamId, userId, ...rest } = router.query;
          const query: { teamId?: number; userId?: number } = {};
          const parsedTeamId = Number(Array.isArray(teamId) ? teamId[0] : teamId);
          const parsedUserId = Number(Array.isArray(userId) ? userId[0] : userId);

          if ((teamId && !userId) || (userId && teamId)) {
            query.teamId = parsedTeamId;
            setSelectedTeamId(parsedTeamId);
            setSelectedUserId(null);
          } else if (userId && !teamId) {
            query.userId = parsedUserId;
            setSelectedUserId(parsedUserId);
            setSelectedTeamId(null);
          }

          router.push({
            query,
          });
        },
      }}>
      {children}
    </FilterProvider>
  );
}
