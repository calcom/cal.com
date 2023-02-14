import { BookingLimit, DurationLimit } from "@calcom/types/Calendar";

export const validateLimitOrder = (input: BookingLimit | DurationLimit, validationOrderKeys: string[]) => {
  // Sort limits by validationOrder
  const sorted = Object.entries(input)
    .sort(([, value], [, valuetwo]) => {
      return value - valuetwo;
    })
    .map(([key]) => key);

  const validationOrderWithoutMissing = validationOrderKeys.filter((key) => sorted.includes(key));

  return sorted.every((key, index) => validationOrderWithoutMissing[index] === key);
};
