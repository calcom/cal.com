import { ascendingLimitKeys } from "./intervalLimit";
import type { IntervalLimit } from "./intervalLimitSchema";

export const validateIntervalLimitOrder = (input: IntervalLimit) => {
  // Sort limits by validationOrder
  const sorted = Object.entries(input)
    .sort(([, value], [, valuetwo]) => {
      return value - valuetwo;
    })
    .map(([key]) => key);

  const validationOrderWithoutMissing = ascendingLimitKeys.filter((key) => sorted.includes(key));

  return sorted.every((key, index) => validationOrderWithoutMissing[index] === key);
};
