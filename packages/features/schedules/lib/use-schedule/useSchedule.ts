import dayjs from "@calcom/dayjs";
import { trpc } from "@calcom/trpc/react";

type UseScheduleWithCacheArgs = {
  username: string;
  eventSlug: string;
  eventId?: number;
  browsingMonth: Date;
  timezone: string;
};

export const useSchedule = ({
  browsingMonth,
  timezone,
  username,
  eventSlug,
  eventId,
}: UseScheduleWithCacheArgs) => {
  const month = dayjs(browsingMonth);

  return trpc.viewer.public.slots.getSchedule.useQuery(
    {
      usernameList: [username],
      eventTypeSlug: eventSlug,
      // @TODO: Old code fetched 2 days ago if we were fetching the current month.
      // Do we want / need to keep that behavior?
      startTime: month.startOf("month").toISOString(),
      endTime: month.endOf("month").toISOString(),
      timeZone: timezone,
      eventTypeId: eventId,
    },
    {
      refetchOnWindowFocus: false,
      enabled: !!eventId,
    }
  );
};
