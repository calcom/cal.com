import { useMemo } from "react";

import dayjs from "@calcom/dayjs";

import type { Slots } from "./types";

/**
 * Get's slots for a specific date from the schedule cache.
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

export const useSlotsForAvailableDates = (dates: (string | null)[], slots?: Slots) => {
  const slotsForDates = useMemo(() => {
    if (slots === undefined) return [];
    return dates
      .filter((date) => date !== null)
      .map((date) => ({
        slots: slots[`${date}`] || [],
        date,
      }));
  }, [dates, slots]);

  const onlyTodayMoreSevenDays = slotsForDates.filter((slot) => {
    return (
      slot.date && dayjs(slot.date).diff(dayjs(), "day") >= 0 && dayjs(slot.date).diff(dayjs(), "day") <= 7
    );
  });

  return onlyTodayMoreSevenDays;
};
