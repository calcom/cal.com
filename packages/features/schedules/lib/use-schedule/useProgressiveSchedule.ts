import { useMemo } from "react";

import dayjs from "@calcom/dayjs";

import { useSchedule } from "./useSchedule";
import type { UseScheduleWithCacheArgs } from "./useSchedule";

export const useProgressiveSchedule = (args: UseScheduleWithCacheArgs) => {
  const now = dayjs();
  const endOfMonth = now.endOf("month");

  const nowFormatted = now.format("YYYY-MM-DD");
  const endOfMonthFormatted = endOfMonth.format("YYYY-MM-DD");

  const weekRanges = useMemo(() => {
    const ranges = [];
    let currentWeekStart = now.startOf("day");

    while (currentWeekStart.isBefore(endOfMonth)) {
      const weekEnd = currentWeekStart.add(6, "days");
      ranges.push({
        start: currentWeekStart,
        end: weekEnd.isAfter(endOfMonth) ? endOfMonth : weekEnd,
        dayCount: weekEnd.isAfter(endOfMonth) ? endOfMonth.diff(currentWeekStart, "days") + 1 : 7,
      });
      currentWeekStart = currentWeekStart.add(7, "days");
    }
    return ranges;
  }, [nowFormatted, endOfMonthFormatted, now, endOfMonth]);

  const firstWeek = useSchedule({
    ...args,
    selectedDate: weekRanges[0]?.start.format("YYYY-MM-DD"),
    dayCount: weekRanges[0]?.dayCount,
    enabled: args.enabled !== false && weekRanges.length > 0,
  });

  const week2 = useSchedule({
    ...args,
    selectedDate: weekRanges[1]?.start.format("YYYY-MM-DD"),
    dayCount: weekRanges[1]?.dayCount,
    enabled: args.enabled !== false && !firstWeek.isPending && weekRanges.length > 1,
  });

  const week3 = useSchedule({
    ...args,
    selectedDate: weekRanges[2]?.start.format("YYYY-MM-DD"),
    dayCount: weekRanges[2]?.dayCount,
    enabled: args.enabled !== false && !firstWeek.isPending && weekRanges.length > 2,
  });

  const week4 = useSchedule({
    ...args,
    selectedDate: weekRanges[3]?.start.format("YYYY-MM-DD"),
    dayCount: weekRanges[3]?.dayCount,
    enabled: args.enabled !== false && !firstWeek.isPending && weekRanges.length > 3,
  });

  const week5 = useSchedule({
    ...args,
    selectedDate: weekRanges[4]?.start.format("YYYY-MM-DD"),
    dayCount: weekRanges[4]?.dayCount,
    enabled: args.enabled !== false && !firstWeek.isPending && weekRanges.length > 4,
  });

  const subsequentWeeks = [week2, week3, week4, week5].slice(0, weekRanges.length - 1);

  const combinedSlots = useMemo(() => {
    const slots: Record<string, unknown[]> = {};

    if (firstWeek.data?.slots) {
      Object.assign(slots, firstWeek.data.slots);
    }

    subsequentWeeks.forEach((week) => {
      if (week.data?.slots) {
        Object.assign(slots, week.data.slots);
      }
    });

    return slots;
  }, [firstWeek.data?.slots, subsequentWeeks]);

  const allWeeks = [firstWeek, ...subsequentWeeks];
  const isAnyLoading = allWeeks.some((week) => week.isPending);

  return {
    ...firstWeek,
    data: firstWeek.data ? { ...firstWeek.data, slots: combinedSlots } : { slots: combinedSlots },
    isPending: firstWeek.isPending,
    isLoading: isAnyLoading,
    weekLoadingStates: allWeeks.map((week) => ({
      isPending: week.isPending,
      isLoading: week.isLoading,
    })),
    isFirstWeekLoaded: !firstWeek.isPending,
  };
};
