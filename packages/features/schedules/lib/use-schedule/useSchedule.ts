import { useEffect } from "react";
import { create } from "zustand";

import dayjs from "@calcom/dayjs";
import { trpc } from "@calcom/trpc/react";

import { Schedule, Slots } from "./types";

type ScheduleStore = {
  schedules: Schedule;
  addScheduleToCache: (monthKey: string, slots: Slots) => void;
  clearCache: () => void;
};

const useScheduleStore = create<ScheduleStore>((set) => ({
  schedules: {},
  clearCache: () => set({ schedules: {} }),
  addScheduleToCache: (monthKey: string, slots: Slots) =>
    set((state) => {
      state.schedules = {
        ...state.schedules,
        [monthKey]: slots,
      };
      return state;
    }),
}));

type UseScheduleWithCacheArgs = {
  username: string;
  eventSlug: string;
  browsingMonth: Date;
  timezone: string;
};

export type UseScheduleWithCacheResult = {
  isLoading?: boolean;
  data?: Slots;
};

// @TODO: Clear cache when any of arguments change.
export const useScheduleWithCache = ({
  browsingMonth,
  timezone,
  username,
  eventSlug,
}: UseScheduleWithCacheArgs): UseScheduleWithCacheResult => {
  const month = dayjs(browsingMonth);
  const monthKey = month.format("YYYY-MM");

  const scheduleFromCache = useScheduleStore((state) => state.schedules[username]?.[monthKey]);
  const addScheduleToCache = useScheduleStore((state) => state.addScheduleToCache);
  const clearCache = useScheduleStore((state) => state.clearCache);

  // Clear cache when any of the props change, to prevent
  // old data from sticking around.
  // @TODO: Do we want a smarter cache that can cache multiple events?
  useEffect(() => {
    clearCache();
  }, [timezone, username, eventSlug, clearCache]);

  if (scheduleFromCache)
    return {
      isLoading: false,
      data: { slots: scheduleFromCache },
    };

  const schedule = trpc.viewer.public.slots.getSchedule.useQuery(
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
      onSuccess(data) {
        addScheduleToCache(monthKey, data.slots);
      },
    }
  );

  return {
    isLoading: schedule.isLoading,
    data: schedule.data?.slots,
  };
};
