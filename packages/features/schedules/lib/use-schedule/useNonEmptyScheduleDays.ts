import { useMemo } from "react";

import type { ManipulateType } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import { yyyymmdd } from "@calcom/lib/date-fns";
import { Frequency } from "@calcom/prisma/zod-utils";

import type { Slots } from "../use-schedule";

type AdditionalParams = {
  occurenceCount?: null | number;
  recurringEventFreq?: Frequency;
};

const retainDaysWithFirstTwoSlotsAvailable = (
  nonEmptyDays: Set<string>,
  occurenceCount: number,
  recurringEventFreq: Frequency
) => {
  const isDateSlotAvailable = (date: string) => nonEmptyDays.has(date);

  // If occurenceCount is 1, no modifications are needed
  if (occurenceCount === 1) return;

  const freqKey = Frequency[recurringEventFreq]?.toLowerCase();

  // Only process supported frequency types
  if (!["weekly", "monthly", "yearly"].includes(freqKey)) return;

  const frequencyToSuffix: Record<string, ManipulateType> = {
    weekly: "week",
    monthly: "month",
    yearly: "year",
  };

  const suffix = frequencyToSuffix[freqKey];

  if (suffix) {
    nonEmptyDays.forEach((date) => {
      const nextDateSlot = yyyymmdd(dayjs(date).add(1, suffix));
      if (!isDateSlotAvailable(nextDateSlot)) {
        nonEmptyDays.delete(date);
      }
    });
  }
};

export const getNonEmptyScheduleDays = (slots?: Slots, additionalParams?: AdditionalParams) => {
  if (!slots || typeof slots === "undefined") return [];
  const nonEmptyDays = new Set<string>();

  // Populate initial set of non-empty days
  Object.keys(slots).forEach((date) => {
    if (slots[date].some((slot) => !(slot?.away && !slot.toUser) && slots[date].length > 0)) {
      nonEmptyDays.add(date);
    }
  });

  // For recurring events
  if (
    additionalParams?.occurenceCount &&
    (additionalParams?.recurringEventFreq || additionalParams?.recurringEventFreq == 0)
  ) {
    retainDaysWithFirstTwoSlotsAvailable(
      nonEmptyDays,
      additionalParams.occurenceCount,
      additionalParams.recurringEventFreq
    );
  }

  return Array.from(nonEmptyDays);
};

export const useNonEmptyScheduleDays = (slots?: Slots, additionalParams?: AdditionalParams) => {
  return useMemo(
    () => getNonEmptyScheduleDays(slots, additionalParams),
    [slots, additionalParams?.occurenceCount, additionalParams?.recurringEventFreq]
  );
};
