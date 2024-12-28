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

    return dates
      .filter((date) => date !== null)
      .filter((date) => dayjs(date).isBefore(nextWeekDay) || !isTherapy)
      .map((date) => {
        if (!isTherapy) return { slots: slots[date] || [], date };

        const nextWeekDay = dayjs(date).add(7, "day").format("YYYY-MM-DD");
        const nextFortnightlyDay = dayjs(date).add(15, "day").format("YYYY-MM-DD");

        const nextDateSlots = slots && slots[nextWeekDay]?.map(({ time }) => dayjs(time).toISOString());
        console.log(nextWeekDay, nextDateSlots);

        const filteredSlots = nextDateSlots
          ? slots[date].filter(({ time }) => {
              const nextWeekSchedule = dayjs(time).add(7, "day").toISOString();
              return nextDateSlots.includes(nextWeekSchedule);
            })
          : slots[date];

        return { slots: filteredSlots || [], date };
      });
  }, [dates, isTherapy, nextWeekDay, slots]);

  return slotsForDates;
};
