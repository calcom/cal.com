import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";

import dayjs from "@calcom/dayjs";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { BookingStatus } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc";

import { useDefaultRoutingForm } from "../hooks/useDefaultRoutingForm";
import type { FilterContextType } from "./provider";
import { FilterProvider } from "./provider";

const querySchema = z.object({
  startTime: z.string().nullable(),
  endTime: z.string().nullable(),
  teamId: z.coerce.number().nullable(),
  userId: z.coerce.number().nullable(),
  memberUserId: z.coerce.number().nullable(),
  eventTypeId: z.coerce.number().nullable(),
  filter: z
    .union([z.enum(["event-type", "user", "routing_forms", "booking_status"]), z.string().regex(/^rf_.*$/)])
    .nullable(),
  routingFormId: z.string().nullable(),
  bookingStatus: z.enum(["NO_BOOKING", ...Object.values(BookingStatus)]).nullable(),
});

// TODO(SEAN): We can have a big refactor here and move this all out of context and into query state. This will make it easier to create shareable links
export function FiltersProvider({ children }: { children: React.ReactNode }) {
  // searchParams to get initial values from query params
  const utils = trpc.useUtils();
  const searchParams = useCompatSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  let startTimeParsed,
    endTimeParsed,
    teamIdParsed: number | undefined | null,
    userIdParsed,
    eventTypeIdParsed,
    filterParsed,
    routingFormIdParsed,
    bookingStatusParsed,
    memberUserIdParsed;

  const safe = querySchema.safeParse({
    startTime: searchParams?.get("startTime") ?? null,
    endTime: searchParams?.get("endTime") ?? null,
    teamId: searchParams?.get("teamId") ?? null,
    userId: searchParams?.get("userId") ?? null,
    eventTypeId: searchParams?.get("eventTypeId") ?? null,
    filter: searchParams?.get("filter") ?? null,
    memberUserId: searchParams?.get("memberUserId") ?? null,
    routingFormId: searchParams?.get("routingFormId") ?? null,
    bookingStatus: searchParams?.get("bookingStatus") ?? null,
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
    routingFormIdParsed = safe.data.routingFormId;
    memberUserIdParsed = safe.data.memberUserId;
    bookingStatusParsed = safe.data.bookingStatus;
  }

  const [configFilters, setConfigFilters] = useState<FilterContextType["filter"]>({
    dateRange: [
      startTimeParsed ? dayjs(startTimeParsed) : dayjs().subtract(1, "week"),
      endTimeParsed ? dayjs(endTimeParsed) : dayjs(),
      !startTimeParsed && !endTimeParsed ? "w" : null,
    ],
    selectedTimeView: "week",
    selectedUserId: userIdParsed || null,
    selectedMemberUserId: memberUserIdParsed || null,
    selectedTeamId: teamIdParsed || null,
    selectedTeamName: null,
    selectedEventTypeId: eventTypeIdParsed || null,
    selectedFilter: filterParsed
      ? [filterParsed as "event-type" | "user" | "routing_forms" | `rf_${string}`]
      : null,
    selectedRoutingFormId: routingFormIdParsed || null,
    selectedBookingStatus: bookingStatusParsed || null,
    isAll: false,
    initialConfig: {
      userId: null,
      teamId: null,
      isAll: null,
    },
  });

  // Use the custom hook
  const { mostPopularForm } = useDefaultRoutingForm({
    userId: userIdParsed,
    teamId: teamIdParsed,
    isAll: safe.success ? !!safe.data.teamId : false,
    routingFormId: routingFormIdParsed,
    onRoutingFormChange: (formId) => {
      setConfigFilters((prev) => ({
        ...prev,
        selectedFilter: prev.selectedFilter ? [...prev.selectedFilter, "routing_forms"] : ["routing_forms"],
        selectedRoutingFormId: formId,
      }));
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
    selectedRoutingFormId,
    selectedBookingStatus,
    selectedRoutingFormFilter,
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
          selectedRoutingFormId,
          selectedBookingStatus,
          selectedRoutingFormFilter,
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
            selectedRoutingFormId,
            selectedBookingStatus,
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
          setParamsIfDefined("startTime", startTime?.format("YYYY-MM-DD"));
          setParamsIfDefined("endTime", endTime?.format("YYYY-MM-DD"));
          setParamsIfDefined("filter", selectedFilter?.[0]);
          setParamsIfDefined("routingFormId", selectedRoutingFormId);
          setParamsIfDefined("bookingStatus", selectedBookingStatus);
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
            dateRange: [dayjs().subtract(1, "week"), dayjs(), "w"],
            initialConfig,
            selectedRoutingFormId: mostPopularForm?.id ?? null, // Set the most popular form as default when clearing filters
            selectedBookingStatus: null,
            selectedRoutingFormFilter: null,
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
