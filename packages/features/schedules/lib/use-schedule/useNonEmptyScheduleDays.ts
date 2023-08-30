import { useMemo } from "react";

import type { Slots } from "../use-schedule";

export const getNonEmptyScheduleDays = (slots?: Slots) => {
  if (typeof slots === "undefined") return [];
  return Object.keys(slots).filter((day) => slots[day].length > 0);
};

export const useNonEmptyScheduleDays = (slots?: Slots) => {
  const days = useMemo(() => getNonEmptyScheduleDays(slots), [slots]);

  return days;
};
