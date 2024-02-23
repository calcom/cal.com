import { useMemo } from "react";

import type { IFromUser, IToUser } from "@calcom/core/getUserAvailability";

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

export const useSlotsForAvailableDates = (
  dates: string[] | null,
  slots?: Slots
): {
  slots: Slots;
  date: string | null;
  away: boolean;
  toUser?: IToUser | null;
  fromUser?: IFromUser | null;
  returnDate: string | null;
}[] => {
  const slotsForDates = useMemo(() => {
    return dates
      ?.filter((date) => date !== null)
      .map((date) => {
        return {
          slots: slots?.hasOwnProperty(date)
            ? slots[date]
            : ([] as { time: string; attendees?: number | undefined; bookingUid?: string | undefined }[]),
          date,
        };
      });
  }, [dates, slots]);

  return slotsForDates;
};
