import { useSearchParams } from "next/navigation";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { z } from "zod";

import dayjs from "@calcom/dayjs";

import type { FilterContextType } from "./provider";
import { FilterProvider } from "./provider";

export function FiltersProvider({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  // useRouter to get initial values from query params
  const router = useRouter();
  const pathname = usePathname();
  const startTime = searchParams?.get("startTime"),
    endTime = searchParams?.get("endTime"),
    teamId = searchParams?.get("teamId"),
    userId = searchParams?.get("userId"),
    eventTypeId = searchParams?.get("eventTypeId"),
    filter = searchParams?.get("filter"),
    memberUserId = searchParams?.get("memberUserId");
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

          const urlSearchParams = new URLSearchParams(searchParams ?? undefined);

          if (filter?.[0] !== null && filter?.[0] !== undefined) {
            urlSearchParams.set("filter", filter?.[0]);
          }

          if (userId) {
            urlSearchParams.set("userId", String(userId));
          }

          if (eventTypeId) {
            urlSearchParams.set("eventTypeId", String(eventTypeId));
          }

          router.push(`${pathname}?${urlSearchParams.toString()}`);
        },
        setDateRange: (dateRange) => {
          const urlSearchParams = new URLSearchParams(searchParams ?? undefined);

          urlSearchParams.set("startTime", dateRange[0].toISOString());
          urlSearchParams.set("endTime", dateRange[1].toISOString());

          setDateRange(dateRange);
          router.push(`${pathname}?${urlSearchParams.toString()}`);
        },
        setSelectedTimeView: (selectedTimeView) => setSelectedTimeView(selectedTimeView),
        setSelectedMemberUserId: (selectedMemberUserId) => {
          const urlSearchParams = new URLSearchParams(searchParams ?? undefined);

          urlSearchParams.delete("userId");
          urlSearchParams.delete("eventTypeId");

          if (selectedMemberUserId) {
            urlSearchParams.set("memberUserId", String(selectedMemberUserId));
          } else {
            urlSearchParams.delete("memberUserId");
          }

          setSelectedMemberUserId(selectedMemberUserId);

          router.push(`${pathname}?${urlSearchParams.toString()}`);
        },
        setSelectedTeamId: (selectedTeamId) => {
          setSelectedTeamId(selectedTeamId);
          setSelectedUserId(null);
          setSelectedMemberUserId(null);
          setSelectedEventTypeId(null);

          const urlSearchParams = new URLSearchParams(searchParams ?? undefined);
          // TODO should we remove userId
          if (selectedTeamId) {
            urlSearchParams.set("teamId", String(selectedTeamId));
          } else {
            urlSearchParams.delete("teamId");
          }

          urlSearchParams.delete("eventTypeId");
          urlSearchParams.delete("memberUserId");

          router.push(`${pathname}?${urlSearchParams.toString()}`);
        },
        setSelectedUserId: (selectedUserId) => {
          setSelectedUserId(selectedUserId);
          setSelectedTeamId(null);
          setSelectedTeamName(null);
          setSelectedEventTypeId(null);

          const urlSearchParams = new URLSearchParams(searchParams ?? undefined);
          urlSearchParams.delete("teamId");
          urlSearchParams.delete("eventTypeId");
          urlSearchParams.delete("memberUserId");

          if (selectedUserId) {
            urlSearchParams.set("userId", String(selectedUserId));
          } else {
            urlSearchParams.delete("userId");
          }

          router.push(`${pathname}?${urlSearchParams.toString()}`);
        },
        setSelectedTeamName: (selectedTeamName) => setSelectedTeamName(selectedTeamName),
        setSelectedEventTypeId: (selectedEventTypeId) => {
          setSelectedEventTypeId(selectedEventTypeId);

          const urlSearchParams = new URLSearchParams(searchParams ?? undefined);

          if (selectedEventTypeId) {
            urlSearchParams.set("eventTypeId", String(selectedEventTypeId));
          } else {
            urlSearchParams.delete("eventTypeId");
          }

          router.push(`${pathname}?${urlSearchParams.toString()}`);
        },
        clearFilters: () => {
          setSelectedTeamName(null);
          setSelectedEventTypeId(null);
          setSelectedMemberUserId(null);
          setSelectedFilter(null);

          const teamId = searchParams?.get("teamId");
          const userId = searchParams?.get("userId");

          const urlSearchParams = new URLSearchParams();

          if ((teamId && !userId) || (userId && teamId)) {
            urlSearchParams.set("teamId", teamId);

            setSelectedTeamId(Number(teamId));
            setSelectedUserId(null);
          } else if (userId && !teamId) {
            urlSearchParams.set("userId", userId);

            setSelectedUserId(Number(userId));
            setSelectedTeamId(null);
          }

          router.push(`${pathname}?${urlSearchParams.toString()}`);
        },
      }}>
      {children}
    </FilterProvider>
  );
}
