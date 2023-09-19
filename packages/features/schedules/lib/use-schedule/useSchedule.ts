import dayjs from "@calcom/dayjs";
import { getUsernameList } from "@calcom/lib/defaultEvents";
import { trpc } from "@calcom/trpc/react";

type UseScheduleWithCacheArgs = {
  username?: string | null;
  eventSlug?: string | null;
  eventId?: number | null;
  month?: string | null;
  timezone?: string | null;
  prefetchNextMonth?: boolean;
  duration?: number | null;
  monthCount?: number | null;
  rescheduleUid?: string | null;
  isTeamEvent?: boolean;
};

export const useSchedule = ({
  month,
  timezone,
  username,
  eventSlug,
  eventId,
  prefetchNextMonth,
  duration,
  monthCount,
  rescheduleUid,
  isTeamEvent,
}: UseScheduleWithCacheArgs) => {
  const monthDayjs = month ? dayjs(month) : dayjs();
  const nextMonthDayjs = monthDayjs.add(monthCount ? monthCount : 1, "month");
  // Why the non-null assertions? All of these arguments are checked in the enabled condition,
  // and the query will not run if they are null. However, the check in `enabled` does
  // no satisfy typescript.
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
      startTime: monthDayjs.startOf("month").toISOString(),
      // if `prefetchNextMonth` is true, two months are fetched at once.
      endTime: (prefetchNextMonth ? nextMonthDayjs : monthDayjs).endOf("month").toISOString(),
      timeZone: timezone!,
      duration: duration ? `${duration}` : undefined,
      rescheduleUid,
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
