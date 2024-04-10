import { useTimesForSchedule } from "@calcom/features/schedules/lib/use-schedule/useTimesForSchedule";
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
  bookerEmail?: string;
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
  bookerEmail,
}: UseScheduleWithCacheArgs) => {
  const [startTime, endTime] = useTimesForSchedule({
    month,
    monthCount,
    dayCount,
    prefetchNextMonth,
    selectedDate,
  });

  return trpc.viewer.public.slots.getSchedule.useQuery(
    {
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
      bookerEmail,
    },
    {
      trpc: {
        context: {
          skipBatch: true,
        },
      },
      refetchOnWindowFocus: false,
      enabled:
        Boolean(username) &&
        Boolean(month) &&
        Boolean(timezone) &&
        // Should only wait for one or the other, not both.
        (Boolean(eventSlug) || Boolean(eventId) || eventId === 0),
    }
  );
};
