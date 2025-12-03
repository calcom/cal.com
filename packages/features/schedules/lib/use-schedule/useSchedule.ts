import { useRef } from "react";
import { useSearchParams } from "next/navigation";

import { updateEmbedBookerState, useIsEmbedPrerendering } from "@calcom/embed-core/src/embed-iframe";
import { sdkActionManager } from "@calcom/embed-core/src/sdk-event";
import { useBookerStore } from "@calcom/features/bookings/Booker/store";
import { isBookingDryRun } from "@calcom/features/bookings/Booker/utils/isBookingDryRun";
import { useTimesForSchedule } from "@calcom/features/schedules/lib/use-schedule/useTimesForSchedule";
import { getRoutedTeamMemberIdsFromSearchParams } from "@calcom/lib/bookings/getRoutedTeamMemberIdsFromSearchParams";
import { PUBLIC_QUERY_AVAILABLE_SLOTS_INTERVAL_SECONDS } from "@calcom/lib/constants";
import { getUsernameList } from "@calcom/features/eventtypes/lib/defaultEvents";
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

/**
 * Hook that returns a function to fire availabilityLoaded or availabilityRefreshed events.
 * Manages the lastDataUpdatedAt timestamp internally to distinguish initial load from refreshes.
 * Prevents firing events during prerender mode.
 */
const useAvailabilityEvents = () => {
  const lastDataUpdatedAtRef = useRef<number | null>(null);
  const isEmbedPrerendering = useIsEmbedPrerendering();

  return function fireAvailabilityEvents({
    eventId,
    eventSlug,
    availabilityDataUpdateTime,
  }: {
    eventId: number;
    eventSlug: string;
    availabilityDataUpdateTime: number;
  }) {
    if (isEmbedPrerendering) {
      return;
    }

    const lastDataUpdatedAt = lastDataUpdatedAtRef.current;

    // Send on next tick to ensure that bookerViewed which also uses useSchedule hook's return value is fired first always.
    // Otherwise, in the case of clicking CTA when prerendered/prerendering, we are at a risk of firing availabilityLoaded event before bookerViewed.
    // This is because prerender doesn't allow firing bookerViewed and the very first chance it gets after leaving prerender mode useSchedule hook ends up firing availabilityLoaded event.
    function scheduleEventOnNextTick(callback: () => void) {
      setTimeout(() => {
        callback();
      }, 0);
    }
    if (lastDataUpdatedAt === null) {
      // First successful load - fire availabilityLoaded
      scheduleEventOnNextTick(() => {
        sdkActionManager?.fire("availabilityLoaded", { eventId, eventSlug });
      });
    } else if (availabilityDataUpdateTime > lastDataUpdatedAt) {
      // Data was refreshed - fire availabilityRefreshed
      scheduleEventOnNextTick(() => {
        sdkActionManager?.fire("availabilityRefreshed", { eventId, eventSlug });
      });
    }
    lastDataUpdatedAtRef.current = availabilityDataUpdateTime;
  };
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
  const fireAvailabilityEvents = useAvailabilityEvents();

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
  const utils = trpc.useUtils();
  const routingFormResponseIdParam = searchParams?.get("cal.routingFormResponseId");
  const queuedFormResponseId = searchParams?.get("cal.queuedFormResponseId");
  const email = searchParams?.get("email");
  // We allow skipping the schedule fetch as a requirement for prerendering in iframe through embed as when the pre-rendered iframe is connected, then we would fetch the availability, which would be upto-date
  // Also, a reuse through Headless Router could completely change the availability as different team members are selected and thus it is unnecessary to fetch the schedule
  const skipGetSchedule = searchParams?.get("cal.skipSlotsFetch") === "true";
  const routingFormResponseId = routingFormResponseIdParam
    ? parseInt(routingFormResponseIdParam, 10)
    : undefined;
  const embedConnectVersion = searchParams?.get("cal.embed.connectVersion") || "0";
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
    ...(queuedFormResponseId ? { queuedFormResponseId } : { routingFormResponseId }),
    email,
    // Ensures that connectVersion causes a refresh of the data
    ...(embedConnectVersion ? { embedConnectVersion } : {}),
    _isDryRun: searchParams ? isBookingDryRun(searchParams) : false,
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

  // API V2 query for team events
  const teamScheduleV2 = useApiV2AvailableSlots({
    ...input,
    enabled: isCallingApiV2Slots,
    duration: input.duration ? Number(input.duration) : undefined,
    routedTeamMemberIds: input.routedTeamMemberIds ?? undefined,
    teamMemberEmail: input.teamMemberEmail ?? undefined,
    eventTypeId: eventId ?? undefined,
  });

  const schedule = trpc.viewer.slots.getSchedule.useQuery(input, {
    ...options,
    // Only enable if we're not using API V2
    enabled: options.enabled && !isCallingApiV2Slots,
  });

  if (isCallingApiV2Slots && !teamScheduleV2.failureReason) {
    updateEmbedBookerState({
      bookerState,
      slotsQuery: teamScheduleV2,
    });

    if (teamScheduleV2.isSuccess && eventId && eventSlug) {
      fireAvailabilityEvents({
        eventId,
        eventSlug,
        availabilityDataUpdateTime: teamScheduleV2.dataUpdatedAt,
      });
    }

    return {
      ...teamScheduleV2,
      /**
       * Invalidates the request and resends it regardless of any other configuration including staleTime
       */
      invalidate: () => {
        return teamScheduleV2.refetch();
      },
    };
  }

  updateEmbedBookerState({
    bookerState,
    slotsQuery: schedule,
  });

  if (schedule.isSuccess && eventId && eventSlug) {
    fireAvailabilityEvents({
      eventId,
      eventSlug,
      availabilityDataUpdateTime: schedule.dataUpdatedAt,
    });
  }

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
