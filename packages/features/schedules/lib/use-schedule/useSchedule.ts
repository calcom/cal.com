import { useSearchParams } from "next/navigation";
import { useCallback, useState, useEffect } from "react";

import { useTimesForSchedule } from "@calcom/features/schedules/lib/use-schedule/useTimesForSchedule";
import { getRoutedTeamMemberIdsFromSearchParams } from "@calcom/lib/bookings/getRoutedTeamMemberIdsFromSearchParams";
import { PUBLIC_QUERY_AVAILABLE_SLOTS_INTERVAL_SECONDS } from "@calcom/lib/constants";
import { getUsernameList } from "@calcom/lib/defaultEvents";
import { trpc } from "@calcom/trpc/react";

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
}: UseScheduleWithCacheArgs) => {
  const [combinedSchedule, setCombinedSchedule] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const timeRanges = useTimesForSchedule({
    month,
    monthCount,
    dayCount,
    prefetchNextMonth,
    selectedDate,
  });

  const [startTime, endTime] = timeRanges;

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

  const routingFormResponseId = routingFormResponseIdParam
    ? parseInt(routingFormResponseIdParam, 10)
    : undefined;

  const firstWeekInput = {
    isTeamEvent,
    usernameList: getUsernameList(username ?? ""),
    ...(eventSlug ? { eventTypeSlug: eventSlug } : { eventTypeId: eventId ?? 0 }),
    startTime: timeRanges.firstWeekStartTime,
    endTime: timeRanges.firstWeekEndTime,
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
  };

  const remainingWeeksInput = {
    ...firstWeekInput,
    startTime: timeRanges.firstWeekEndTime,
    endTime: timeRanges.fullPeriodEndTime,
  };

  const options = {
    trpc: {
      context: {
        skipBatch: true,
      },
    },
    refetchOnWindowFocus: true,
    refetchInterval: PUBLIC_QUERY_AVAILABLE_SLOTS_INTERVAL_SECONDS * 1000,
    enabled:
      Boolean(username) &&
      Boolean(month) &&
      Boolean(timezone) &&
      (Boolean(eventSlug) || Boolean(eventId) || eventId === 0),
  };

  const firstWeekSchedule = isTeamEvent
    ? trpc.viewer.highPerf.getTeamSchedule.useQuery(firstWeekInput, options)
    : trpc.viewer.slots.getSchedule.useQuery(firstWeekInput, options);

  const remainingWeeksSchedule = isTeamEvent
    ? trpc.viewer.highPerf.getTeamSchedule.useQuery(remainingWeeksInput, {
        ...options,
        enabled: !!firstWeekSchedule.data && options.enabled, // Only fetch after first week data is available
      })
    : trpc.viewer.slots.getSchedule.useQuery(remainingWeeksInput, {
        ...options,
        enabled: !!firstWeekSchedule.data && options.enabled, // Only fetch after first week data is available
      });

  useEffect(() => {
    if (firstWeekSchedule.data) {
      setIsLoading(false);

      if (!remainingWeeksSchedule.data) {
        setCombinedSchedule(firstWeekSchedule.data);
      }
      // If we have both first week and remaining weeks data
      else {
        const combinedSlots = {
          ...firstWeekSchedule.data.slots,
          ...remainingWeeksSchedule.data.slots,
        };

        setCombinedSchedule({
          ...firstWeekSchedule.data,
          slots: combinedSlots,
        });
      }
    }
  }, [firstWeekSchedule.data, remainingWeeksSchedule.data]);

  const invalidate = useCallback(() => {
    utils.viewer.slots.getSchedule.invalidate(firstWeekInput);
    utils.viewer.slots.getSchedule.invalidate(remainingWeeksInput);
    if (isTeamEvent) {
      utils.viewer.highPerf.getTeamSchedule.invalidate(firstWeekInput);
      utils.viewer.highPerf.getTeamSchedule.invalidate(remainingWeeksInput);
    }
  }, [
    firstWeekInput,
    remainingWeeksInput,
    isTeamEvent,
    utils.viewer.slots.getSchedule,
    utils.viewer.highPerf?.getTeamSchedule,
  ]);

  return {
    data: combinedSchedule,
    isPending: isLoading,
    isError: firstWeekSchedule.isError,
    isSuccess: !!combinedSchedule,
    isLoading,
    invalidate,
  };
};
