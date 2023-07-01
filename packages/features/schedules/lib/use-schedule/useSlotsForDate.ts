import { useMemo } from "react";

import type { Slots } from "./types";
import dayjs from "@calcom/dayjs";

/**
 * Get's slots for a specific date from the schedul cache.
 * @param date Format YYYY-MM-DD
 * @param scheduleCache Instance of useScheduleWithCache
 */

type slot = { time: string; users: string[]; attendees?: number | undefined; bookingUid?: string | undefined; }[];

export const useSlotsForDate = (date: string | null, slots?: Slots) => {
  const slotsForDate = useMemo(() => {
    if (!date || typeof slots === "undefined") return [];
    return slots[date] || [];
  }, [date, slots]);

  return slotsForDate;
};

export const useSlotsForAvailableDates = (dates: (string | null)[], slots: slot[]) => {
  const slotsForDates = useMemo(() => {
    if (typeof slots === "undefined") return [];
    if (slots.length === 0){
      return dates
      .filter((date) => date !== null)
      .map((date) => ({
        slots: [],
        date,
      }));
    }
    return slots.map((slot) => ({
      date: dayjs(slot[0].time).format("YYYY-MM-DD"),
      slots: slot
    }));
  }, [slots]);

  return slotsForDates;
};
