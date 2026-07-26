import { ascendingLimitKeys } from "./intervalLimit";
import type { IntervalLimit } from "./intervalLimitSchema";

/**
 * A limit for a smaller interval may not exceed the limit for a larger one:
 * PER_DAY <= PER_WEEK <= PER_MONTH <= PER_YEAR.
 *
 * Equal neighbours are valid ("5 per day and 5 per week" is coherent), which is
 * why this walks the keys in interval order and compares values directly. The
 * previous implementation sorted by value and compared the resulting key order,
 * so equal values fell back to `Array.sort`'s stability and the verdict depended
 * on the object's key insertion order.
 */
export const validateIntervalLimitOrder = (input: IntervalLimit) => {
  const presentLimits = ascendingLimitKeys
    .filter((key) => input[key] !== undefined)
    .map((key) => input[key] as number);

  return presentLimits.every((limit, index) => index === 0 || presentLimits[index - 1] <= limit);
};
