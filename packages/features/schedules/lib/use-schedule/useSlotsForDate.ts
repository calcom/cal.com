import { useMemo } from "react";

import { UseScheduleWithCacheResult } from "../use-schedule";

/**
 * Get's slots for a specific date from the schedul cache.
 * @param date Format YYYY-MM-DD
 * @param scheduleCache Instance of useScheduleWithCache
 */
export const useSlotsForDate = (date: string | null, scheduleCache: UseScheduleWithCacheResult) => {
  const slots = useMemo(() => {
    if (!date || typeof scheduleCache?.data === "undefined") return [];
    return scheduleCache.data[date] || [];
  }, [date, scheduleCache.data]);

  return slots;
};
