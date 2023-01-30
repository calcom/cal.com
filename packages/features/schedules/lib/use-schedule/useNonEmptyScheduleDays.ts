import { useMemo } from "react";

import { UseScheduleWithCacheResult } from "../use-schedule";

export const useNonEmptyScheduleDays = (scheduleCache: UseScheduleWithCacheResult) => {
  const days = useMemo(() => {
    const schedule = scheduleCache.data;
    if (typeof schedule === "undefined") return [];
    return Object.keys(schedule).filter((day) => schedule[day].length > 0);
  }, [scheduleCache.data]);

  return days;
};
