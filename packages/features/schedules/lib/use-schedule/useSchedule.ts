import dayjs from "@calcom/dayjs";
import { getUsernameList } from "@calcom/lib/defaultEvents";
import { trpc } from "@calcom/trpc/react";

type UseScheduleWithCacheArgs = {
  username?: string | null;
  eventSlug?: string | null;
  month?: string | null;
  timezone?: string | null;
  prefetchNextMonth?: boolean;
  duration?: number | null;
  eventId: number;
};

export const useSchedule = ({
  month,
  timezone,
  username,
  eventSlug,
  prefetchNextMonth,
  duration,
  eventId,
}: UseScheduleWithCacheArgs) => {
  const monthDayjs = month ? dayjs(month) : dayjs();
  const nextMonthDayjs = monthDayjs.add(1, "month");
  // Why the non-null assertions? All of these arguments are checked in the enabled condition,
  // and the query will not run if they are null. However, the check in `enabled` does
  // no satisfy typscript.

  // we can get eventId on the server with org, username, eventSlug and isTeamEvent as input to getPublicEventId
  // we can also pass eventId after fetching it from useEvent() hook
  const isEnabled =
    Boolean(username) &&
    Boolean(eventSlug) &&
    Boolean(month) &&
    Boolean(timezone) &&
    (Boolean(eventId) || eventId === 0);

  return trpc.viewer.public.slots.getSchedule.useQuery(
    {
      usernameList: getUsernameList(username ?? ""),
      eventTypeSlug: eventSlug!,
      // @TODO: Old code fetched 2 days ago if we were fetching the current month.
      // Do we want / need to keep that behavior?
      startTime: monthDayjs.startOf("month").toISOString(),
      // if `prefetchNextMonth` is true, two months are fetched at once.
      endTime: (prefetchNextMonth ? nextMonthDayjs : monthDayjs).endOf("month").toISOString(),
      timeZone: timezone!,
      duration: duration ? `${duration}` : undefined,
      eventTypeId: eventId,
    },
    {
      refetchOnWindowFocus: false,
      enabled: isEnabled,
    }
  );
};
