import { useMemo } from "react";

import type { Slots } from "./types";

/**
 * Get's slots for a specific date from the schedul cache.
 * @param date Format YYYY-MM-DD
 * @param scheduleCache Instance of useScheduleWithCache
 */
export const useSlotsForDate = (date: string | null, slots?: Slots) => {
  const slotsForDate = useMemo(() => {
    if (!date || typeof slots === "undefined") return [];
    return slots[date] || [];
  }, [date, slots]);

  return slotsForDate;
};

export const useSlotsForMultipleDates = (dates: (string | null)[], slots?: Slots) => {
  const slotsForDates = useMemo(() => {
    if (typeof slots === "undefined") return [];
    return dates
      .filter((date) => date !== null)
      .map((date) => ({
        slots: slots[`${date}`] || [],
        date,
      }));
  }, [dates, slots]);

  return slotsForDates;
};
