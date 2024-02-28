import dayjs from "@calcom/dayjs";
import { getUsernameList } from "@calcom/lib/defaultEvents";
import { trpc } from "@calcom/trpc/react";

type UseScheduleWithCacheArgs = {
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
}: UseScheduleWithCacheArgs) => {
  const now = dayjs();
  const monthDayjs = month ? dayjs(month) : now;
  const nextMonthDayjs = monthDayjs.add(monthCount ? monthCount : 1, "month");
  // Why the non-null assertions? All of these arguments are checked in the enabled condition,
  // and the query will not run if they are null. However, the check in `enabled` does
  // no satisfy typescript.
  let startTime;
  let endTime;

  if (!!dayCount && dayCount > 0) {
    if (selectedDate) {
      startTime = dayjs(selectedDate).toISOString();
      endTime = dayjs(selectedDate).add(dayCount, "day").toISOString();
    } else if (monthDayjs.month() === now.month()) {
      startTime = now.startOf("day").toISOString();
      endTime = now.startOf("day").add(dayCount, "day").toISOString();
    } else {
      startTime = monthDayjs.startOf("month").toISOString();
      endTime = monthDayjs.startOf("month").add(dayCount, "day").toISOString();
    }
  } else {
    startTime = monthDayjs.startOf("month").toISOString();
    endTime = (prefetchNextMonth ? nextMonthDayjs : monthDayjs).endOf("month").toISOString();
  }

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
