import dayjs from "@calcom/dayjs";
import { trpc } from "@calcom/trpc/react";

type UseScheduleWithCacheArgs = {
  username?: string | null;
  eventSlug?: string | null;
  eventId?: number | null;
  month?: string | null;
  timezone?: string | null;
  prefetchNextMonth?: boolean;
  duration?: number | null;
};

export const useSchedule = ({
  month,
  timezone,
  username,
  eventSlug,
  eventId,
  prefetchNextMonth,
  duration,
}: UseScheduleWithCacheArgs) => {
  const monthDayjs = month ? dayjs(month) : dayjs();
  const nextMonthDayjs = monthDayjs.add(1, "month");

  // Why the non-null assertions? All of these arguments are checked in the enabled condition,
  // and the query will not run if they are null. However, the check in `enabled` does
  // no satisfy typscript.
  return trpc.viewer.public.slots.getSchedule.useQuery(
    {
      usernameList: username && username.indexOf("+") > -1 ? username.split("+") : [username!],
      eventTypeSlug: eventSlug!,
      // @TODO: Old code fetched 2 days ago if we were fetching the current month.
      // Do we want / need to keep that behavior?
      startTime: monthDayjs.startOf("month").toISOString(),
      // if `prefetchNextMonth` is true, two months are fetched at once.
      endTime: (prefetchNextMonth ? nextMonthDayjs : monthDayjs).endOf("month").toISOString(),
      timeZone: timezone!,
      eventTypeId: eventId!,
      duration: duration ? `${duration}` : undefined,
    },
    {
      refetchOnWindowFocus: false,
      enabled:
        Boolean(username) &&
        Boolean(eventSlug) &&
        (Boolean(eventId) || eventId === 0) &&
        Boolean(month) &&
        Boolean(timezone),
    }
  );
};
