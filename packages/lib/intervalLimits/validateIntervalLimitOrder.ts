import { ascendingLimitKeys } from "./intervalLimit";
import type { IntervalLimit } from "./intervalLimitSchema";

export const validateIntervalLimitOrder = (input: IntervalLimit) => {
  const entries = Object.entries(input) as [keyof IntervalLimit, number][];

  // Sort by value; break ties by canonical key order so equal limits are always valid
  // regardless of object key insertion order.
  const sorted = entries
    .sort(([keyA, valueA], [keyB, valueB]) => {
      if (valueA !== valueB) return valueA - valueB;
      return ascendingLimitKeys.indexOf(keyA) - ascendingLimitKeys.indexOf(keyB);
    })
    .map(([key]) => key);

  const validationOrderWithoutMissing = ascendingLimitKeys.filter((key) => sorted.includes(key));

  return sorted.every((key, index) => validationOrderWithoutMissing[index] === key);
};
