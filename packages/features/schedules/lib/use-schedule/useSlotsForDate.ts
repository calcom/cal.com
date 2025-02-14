import { useCallback, useEffect, useMemo, useState } from "react";

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
  const [slotsPerDay, setSlotsPerDay] = useState<{ date: string; slots: Slots[string] }[]>([]);

  const toggleConfirmButton = useCallback(
    (selectedSlot: Slots[string][number] & { showConfirmButton?: boolean }) => {
      setSlotsPerDay((prevSlotsPerDay) =>
        prevSlotsPerDay.map(({ date, slots }) => ({
          date,
          slots: slots.map((slot) => ({
            ...slot,
            showConfirmButton: slot.time === selectedSlot.time ? !selectedSlot?.showConfirmButton : false,
          })),
        }))
      );
    },
    []
  );

  useEffect(() => {
    if (slots === undefined) {
      setSlotsPerDay([]);
      return;
    }

    const updatedSlots = dates
      .filter((date) => date !== null)
      .map((date) => ({
        slots: slots[`${date}`] || [],
        date,
      }));

    setSlotsPerDay(updatedSlots);
  }, [JSON.stringify(dates), JSON.stringify(slots)]);

  return { slotsPerDay, setSlotsPerDay, toggleConfirmButton } as const;
};
