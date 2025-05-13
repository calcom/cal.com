import { useSearchParams } from "next/navigation";

import { updateEmbedBookerState } from "@calcom/embed-core/src/embed-iframe";
import { useBookerStore } from "@calcom/features/bookings/Booker/store";
import { useTimesForSchedule } from "@calcom/features/schedules/lib/use-schedule/useTimesForSchedule";
import { getRoutedTeamMemberIdsFromSearchParams } from "@calcom/lib/bookings/getRoutedTeamMemberIdsFromSearchParams";
import { PUBLIC_QUERY_AVAILABLE_SLOTS_INTERVAL_SECONDS } from "@calcom/lib/constants";
import { getUsernameList } from "@calcom/lib/defaultEvents";
import { trpc } from "@calcom/trpc/react";

import { useApiV2AvailableSlots } from "./useApiV2AvailableSlots";

export type UseScheduleWithCacheArgs = {
  username?: string | null;
  eventSlug?: string | null;
  eventId?: number | null;
  month?: string | null;
  timezone?: string | null;
  selectedDate?: string | null;
  prefetchNextMonth?: boolean;
  duration?: number | null;
  monthCount?: number | null;
  dayCount?: number | null;
  rescheduleUid?: string | null;
  isTeamEvent?: boolean;
  orgSlug?: string;
  teamMemberEmail?: string | null;
  useApiV2?: boolean;
  enabled?: boolean;
};

export const useSchedule = ({
  month,
  timezone,
  username,
  eventSlug,
  eventId,
  selectedDate,
  prefetchNextMonth,
  duration,
  monthCount,
  dayCount,
  rescheduleUid,
  isTeamEvent,
  orgSlug,
  teamMemberEmail,
  useApiV2 = false,
  enabled: enabledProp = true,
}: UseScheduleWithCacheArgs) => {
  const bookerState = useBookerStore((state) => state.state);

  const [startTime, endTime] = useTimesForSchedule({
    month,
    monthCount,
    dayCount,
    prefetchNextMonth,
    selectedDate,
  });
  const searchParams = useSearchParams();
  const routedTeamMemberIds = searchParams
    ? getRoutedTeamMemberIdsFromSearchParams(new URLSearchParams(searchParams.toString()))
    : null;
  const skipContactOwner = searchParams ? searchParams.get("cal.skipContactOwner") === "true" : false;
  const _cacheParam = searchParams?.get("cal.cache");
  const _shouldServeCache = _cacheParam ? _cacheParam === "true" : undefined;
  const utils = trpc.useUtils();
  const routingFormResponseIdParam = searchParams?.get("cal.routingFormResponseId");
  const email = searchParams?.get("email");
  // We allow skipping the schedule fetch as a requirement for prerendering in iframe through embed as when the pre-rendered iframe is connected, then we would fetch the availability, which would be upto-date
  // Also, a reuse through Headless Router could completely change the availability as different team members are selected and thus it is unnecessary to fetch the schedule
  const skipGetSchedule = searchParams?.get("cal.skipSlotsFetch") === "true";
  const routingFormResponseId = routingFormResponseIdParam
    ? parseInt(routingFormResponseIdParam, 10)
    : undefined;
  const embedConnectVersion = searchParams?.get("cal.embed.connectVersion") || "";
  const input = {
    isTeamEvent,
    usernameList: getUsernameList(username ?? ""),
    // Prioritize slug over id, since slug is the first value we get available.
    // If we have a slug, we don't need to fetch the id.
    // TODO: are queries using eventTypeId faster? Even tho we lost time fetching the id with the slug.
    ...(eventSlug ? { eventTypeSlug: eventSlug } : { eventTypeId: eventId ?? 0 }),
    // @TODO: Old code fetched 2 days ago if we were fetching the current month.
    // Do we want / need to keep that behavior?
    startTime,
    // if `prefetchNextMonth` is true, two months are fetched at once.
    endTime,
    timeZone: timezone!,
    duration: duration ? `${duration}` : undefined,
    rescheduleUid,
    orgSlug,
    teamMemberEmail,
    routedTeamMemberIds,
    skipContactOwner,
    _shouldServeCache,
    routingFormResponseId,
    email,
    // Ensures that connectVersion causes a refresh of the data
    ...(embedConnectVersion ? { embedConnectVersion } : {}),
  };

  const options = {
    trpc: {
      context: {
        skipBatch: true,
      },
    },
    // It allows people who might not have the tab in focus earlier, to get latest available slots
    // It might not work correctly in iframes, so we have refetchInterval to take care of that.
    // But where it works, it should give user latest availability even if they come back to tab before refetchInterval.
    refetchOnWindowFocus: true,
    // It allows long sitting users to get latest available slots
    refetchInterval: PUBLIC_QUERY_AVAILABLE_SLOTS_INTERVAL_SECONDS * 1000,
    enabled:
      !skipGetSchedule &&
      Boolean(username) &&
      Boolean(month) &&
      Boolean(timezone) &&
      // Should only wait for one or the other, not both.
      (Boolean(eventSlug) || Boolean(eventId) || eventId === 0) &&
      enabledProp,
  };

  const isCallingApiV2Slots = useApiV2 && Boolean(isTeamEvent) && options.enabled;
  const teamSchedule = useApiV2AvailableSlots({
    ...input,
    enabled: isCallingApiV2Slots,
    duration: input.duration ? Number(input.duration) : undefined,
    routedTeamMemberIds: input.routedTeamMemberIds ?? undefined,
    teamMemberEmail: input.teamMemberEmail ?? undefined,
    eventTypeId: eventId ?? undefined,
  });

  if (isCallingApiV2Slots) {
    updateEmbedBookerState({
      bookerState,
      slotsQuery: teamSchedule,
    });
    return {
      ...teamSchedule,
      /**
       * Invalidates the request and resends it regardless of any other configuration including staleTime
       */
      invalidate: () => {
        return teamSchedule.refetch();
      },
    };
  }

  const schedule = isTeamEvent
    ? trpc.viewer.highPerf.getTeamSchedule.useQuery(input, options)
    : trpc.viewer.slots.getSchedule.useQuery(input, options);

  updateEmbedBookerState({
    bookerState,
    slotsQuery: schedule,
  });

  return {
    ...schedule,
    /**
     * Invalidates the request and resends it regardless of any other configuration including staleTime
     */
    invalidate: () => {
      return utils.viewer.slots.getSchedule.invalidate(input);
    },
  };
};
