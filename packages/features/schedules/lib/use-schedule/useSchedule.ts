import dayjs from "@calcom/dayjs";
import { trpc } from "@calcom/trpc/react";

type UseScheduleWithCacheArgs = {
  username?: string | null;
  eventSlug?: string | null;
  eventId?: number | null;
  month?: Date | null;
  timezone?: string | null;
};

export const useSchedule = ({ month, timezone, username, eventSlug, eventId }: UseScheduleWithCacheArgs) => {
  const monthDayjs = month ? dayjs(month) : dayjs();

  // Why the non-null assertions? All of these arguments are checked in the enabled condition,
  // and the query will not run if they are null. However, the check in `enabled` does
  // no satisfy typscript.
  return trpc.viewer.public.slots.getSchedule.useQuery(
    {
      usernameList: [username!],
      eventTypeSlug: eventSlug!,
      // @TODO: Old code fetched 2 days ago if we were fetching the current month.
      // Do we want / need to keep that behavior?
      startTime: monthDayjs.startOf("month").toISOString(),
      endTime: monthDayjs.endOf("month").toISOString(),
      timeZone: timezone!,
      eventTypeId: eventId!,
    },
    {
      refetchOnWindowFocus: false,
      enabled:
        Boolean(username) && Boolean(eventSlug) && Boolean(eventId) && Boolean(month) && Boolean(timezone),
    }
  );
};
