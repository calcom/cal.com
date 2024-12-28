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

export const useSlotsForAvailableDates = (dates: (string | null)[], isTherapy = false, slots?: Slots) => {
  const nextWeekDay = dayjs().add(7, "day");

  const slotsForDates = useMemo(() => {
    if (slots === undefined) return [];

    console.log({ slots });
    console.log({ dates });

    return dates
      .filter((date) => date !== null)
      .filter((date) => dayjs(date).isBefore(nextWeekDay) || !isTherapy)
      .map((date) => ({
        slots: slots[`${date}`] || [],
        date,
      }));
  }, [dates, isTherapy, nextWeekDay, slots]);

  return slotsForDates;
};
