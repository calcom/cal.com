import { ascendingLimitKeys } from "./intervalLimit";
import type { IntervalLimit } from "./intervalLimitSchema";

export const validateIntervalLimitOrder = (input: IntervalLimit) => {
  const inputKeys = Object.keys(input);

  const relevantKeys = ascendingLimitKeys.filter((key) => inputKeys.includes(key));

  for (let i = 0; i < relevantKeys.length - 1; i++) {
    const currentKey = relevantKeys[i];
    const nextKey = relevantKeys[i + 1];

    if (input[currentKey] > input[nextKey]) {
      return false;
    }
  }

  return true;
};
