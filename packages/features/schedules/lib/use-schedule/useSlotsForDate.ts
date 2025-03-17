import { useCallback, useEffect, useMemo, useState } from "react";

import dayjs from "@calcom/dayjs";

import type { Slots, Slot } from "./types";

/**
 * Gets slots for a specific date from the schedule cache.
 * @param date Format YYYY-MM-DD
 * @param scheduleCache Instance of useScheduleWithCache
 */

export const useSlotsForDate = (date: string | null, slots?: Slots) => {
  const slotsForDate = useMemo(() => {
    if (!date || typeof slots === "undefined") return [];
    return slots[date as any] || [];
  }, [date, slots]);

  return slotsForDate;
};

export const useSlotsForAvailableDates = (
  dates: (string | null)[],
  isTherapy = false,
  weekly = true,
  slots?: Slots
) => {
  const [slotsPerDay, setSlotsPerDay] = useState<{ date: string | null; slots: Slots[string] }[]>([]);

  const toggleConfirmButton = useCallback((selectedSlot: Slot) => {
    setSlotsPerDay((prevSlotsPerDay) =>
      prevSlotsPerDay.map(({ date, slots }) => ({
        date,
        slots: slots.map((slot) => ({
          ...slot,
          showConfirmButton: slot.time === selectedSlot.time ? !selectedSlot?.showConfirmButton : false,
        })),
      }))
    );
  }, []);

  useEffect(() => {
    if (slots === undefined) {
      setSlotsPerDay([]);
      return;
    }
    const nextWeekDay = dayjs().add(7, "day");

    const updatedSlots = dates
      .filter((date) => date !== null)
      .filter((date) => dayjs(date).isBefore(nextWeekDay) || !isTherapy)
      .map((date) => {
        if (!isTherapy) return { slots: slots[date as any] || [], date };

        const nextWeekDay = dayjs(date).add(7, "day").format("YYYY-MM-DD");
        const nextFortnightlyDay = dayjs(date).add(15, "day").format("YYYY-MM-DD");

        const nextWeekSlots = slots && slots[nextWeekDay]?.map(({ time }) => dayjs(time).toISOString());
        const nextFortnightlySlots =
          slots && slots[nextFortnightlyDay]?.map(({ time }) => dayjs(time).toISOString());

        const filteredSlots =
          nextWeekSlots && nextFortnightlySlots
            ? slots[date as any].filter(({ time }) => {
                const nextWeekSchedule = dayjs(time).add(7, "day").toISOString();
                const nextFortnightlySchedule = dayjs(time).add(15, "day").toISOString();
                return weekly
                  ? nextWeekSlots.includes(nextWeekSchedule)
                  : nextFortnightlySlots.includes(nextFortnightlySchedule);
              })
            : slots[date as any];

        return { slots: filteredSlots || [], date };
      });

    setSlotsPerDay(updatedSlots);
  }, [dates, isTherapy, slots, weekly]);

  return { slotsPerDay, setSlotsPerDay, toggleConfirmButton } as const;
};
