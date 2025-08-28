import { ascendingLimitKeys } from "./intervalLimit";
import type { IntervalLimit } from "./intervalLimitSchema";

export const validateIntervalLimitOrder = (input: IntervalLimit) => {
  const inputKeys = Object.keys(input);

  const relevantKeys = ascendingLimitKeys.filter((key) => inputKeys.includes(key));

  for (let i = 0; i < relevantKeys.length - 1; i++) {
    const currentKey = relevantKeys[i];
    const nextKey = relevantKeys[i + 1];

    const currentValue = input[currentKey];
    const nextValue = input[nextKey];

    if (currentValue === undefined || nextValue === undefined) {
      continue;
    }

    if (currentValue > nextValue) {
      return false;
    }
  }

  return true;
};
