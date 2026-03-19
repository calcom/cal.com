import type { Slots } from "@calcom/features/calendars/lib/types";
import { useMemo } from "react";

const getNonEmptyScheduleDays = (slots?: Slots) => {
  if (typeof slots === "undefined") return [];

  const nonEmptyDays: string[] = [];

  Object.keys(slots).forEach((date) => {
    if (
      slots[date].some(
        (slot) => !(slot?.away && !slot.toUser && !slot.showNotePublicly) && slots[date].length > 0
      )
    ) {
      nonEmptyDays.push(date);
    }
  });

  return nonEmptyDays;
};

export const useNonEmptyScheduleDays = (slots?: Slots) => {
  const days = useMemo(() => getNonEmptyScheduleDays(slots), [slots]);

  return days;
};
