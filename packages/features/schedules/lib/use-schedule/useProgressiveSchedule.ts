import dayjs from "@calcom/dayjs";

import { useSchedule } from "./useSchedule";
import type { UseScheduleWithCacheArgs } from "./useSchedule";

export const useProgressiveSchedule = (args: UseScheduleWithCacheArgs) => {
  const now = dayjs();
  const endOfMonth = now.endOf("month");

  const weekRanges = [];
  let currentWeekStart = now.startOf("day");

  while (currentWeekStart.isBefore(endOfMonth)) {
    const weekEnd = currentWeekStart.add(6, "days");
    weekRanges.push({
      start: currentWeekStart,
      end: weekEnd.isAfter(endOfMonth) ? endOfMonth : weekEnd,
      dayCount: weekEnd.isAfter(endOfMonth) ? endOfMonth.diff(currentWeekStart, "days") + 1 : 7,
    });
    currentWeekStart = currentWeekStart.add(7, "days");
  }

  const week1 = useSchedule({
    ...args,
    selectedDate: weekRanges[0]?.start.format("YYYY-MM-DD"),
    dayCount: weekRanges[0]?.dayCount,
    enabled: args.enabled !== false && weekRanges.length > 0,
  });

  const week2 = useSchedule({
    ...args,
    selectedDate: weekRanges[1]?.start.format("YYYY-MM-DD"),
    dayCount: weekRanges[1]?.dayCount,
    enabled: args.enabled !== false && weekRanges.length > 1,
  });

  const week3 = useSchedule({
    ...args,
    selectedDate: weekRanges[2]?.start.format("YYYY-MM-DD"),
    dayCount: weekRanges[2]?.dayCount,
    enabled: args.enabled !== false && weekRanges.length > 2,
  });

  const week4 = useSchedule({
    ...args,
    selectedDate: weekRanges[3]?.start.format("YYYY-MM-DD"),
    dayCount: weekRanges[3]?.dayCount,
    enabled: args.enabled !== false && weekRanges.length > 3,
  });

  const week5 = useSchedule({
    ...args,
    selectedDate: weekRanges[4]?.start.format("YYYY-MM-DD"),
    dayCount: weekRanges[4]?.dayCount,
    enabled: args.enabled !== false && weekRanges.length > 4,
  });

  const scheduleQueries = [week1, week2, week3, week4, week5].slice(0, weekRanges.length);

  const combinedSlots: Record<string, unknown> = {};
  const isAnyLoading = scheduleQueries.some((query) => query.isPending);

  scheduleQueries.forEach((query) => {
    if (query.data?.slots) {
      Object.assign(combinedSlots, query.data.slots);
    }
  });

  const hasError = scheduleQueries.some((query) => query.isError);
  const isSuccess = scheduleQueries.every((query) => query.isSuccess || query.isPending);
  const firstQuery = scheduleQueries[0];

  return {
    ...firstQuery,
    data: firstQuery?.data ? { ...firstQuery.data, slots: combinedSlots } : { slots: combinedSlots },
    isLoading: isAnyLoading,
    isError: hasError,
    isSuccess: isSuccess && !isAnyLoading,
    invalidate: firstQuery?.invalidate || (() => Promise.resolve()),
  };
};
