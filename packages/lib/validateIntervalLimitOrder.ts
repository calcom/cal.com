import type { IntervalLimit } from "@calcom/types/Calendar";

const validationOrderKeys = ["PER_DAY", "PER_WEEK", "PER_MONTH", "PER_YEAR"];
export const validateIntervalLimitOrder = (input: IntervalLimit) => {
  // Sort limits by validationOrder
  const sorted = Object.entries(input)
    .sort(([, value], [, valuetwo]) => {
      return value - valuetwo;
    })
    .map(([key]) => key);

  const validationOrderWithoutMissing = validationOrderKeys.filter((key) => sorted.includes(key));

  return sorted.every((key, index) => validationOrderWithoutMissing[index] === key);
};
