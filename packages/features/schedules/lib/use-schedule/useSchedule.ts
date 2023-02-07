import dayjs from "@calcom/dayjs";
import { trpc } from "@calcom/trpc/react";

type UseScheduleWithCacheArgs = {
  username: string;
  eventSlug: string;
  browsingMonth: Date;
  timezone: string;
};

export const useSchedule = ({ browsingMonth, timezone, username, eventSlug }: UseScheduleWithCacheArgs) => {
  const month = dayjs(browsingMonth);
  // const monthKey = month.format("YYYY-MM");

  // const scheduleFromCache = useScheduleStore((state) => state.schedules[username]?.[monthKey]);
  // const addScheduleToCache = useScheduleStore((state) => state.addScheduleToCache);
  // const clearCache = useScheduleStore((state) => state.clearCache);

  // // Clear cache when any of the props change, to prevent
  // // old data from sticking around.
  // // @TODO: Do we want a smarter cache that can cache multiple events?
  // useEffect(() => {
  //   clearCache();
  // }, [timezone, username, eventSlug, clearCache]);

  // if (scheduleFromCache)
  //   return {
  //     isLoading: false,
  //     data: { slots: scheduleFromCache },
  //   };

  return trpc.viewer.public.slots.getSchedule.useQuery(
    {
      usernameList: [username],
      eventTypeSlug: eventSlug,
      // @TODO: Old code fetched 2 days ago if we were fetching the current month.
      // Do we want / need to keep that behavior?
      startTime: month.startOf("month").toISOString(),
      endTime: month.endOf("month").toISOString(),
      timeZone: timezone,
    },
    {
      refetchOnWindowFocus: false,
      // onSuccess(data) {
      //   addScheduleToCache(monthKey, data.slots);
      // },
    }
  );

  // return schedule;

  // return {
  //   isLoading: schedule.isLoading,
  //   data: schedule.data?.slots,
  // };
};
