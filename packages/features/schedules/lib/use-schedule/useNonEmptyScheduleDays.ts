import { useMemo } from "react";

import type { Slots } from "../use-schedule/types";

export const getNonEmptyScheduleDays = (slots?: Slots) => {
  if (typeof slots === "undefined") return [];

  const nonEmptyDays: string[] = [];

  Object.keys(slots).forEach((date) => {
    if (slots[date].some((slot) => !(slot?.away && !slot.toUser && !slot.showNotePublicly) && slots[date].length > 0)) {
      nonEmptyDays.push(date);
    }
  });

  return nonEmptyDays;
};

export const useNonEmptyScheduleDays = (slots?: Slots) => {
  const days = useMemo(() => getNonEmptyScheduleDays(slots), [slots]);

  return days;
};
