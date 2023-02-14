import { validateLimitOrder } from "@calcom/lib/validateLimitOrder";
import { durationLimitsType } from "@calcom/prisma/zod-utils";
import { DurationLimit } from "@calcom/types/Calendar";

export function isDurationLimit(obj: unknown): obj is DurationLimit {
  return durationLimitsType.safeParse(obj).success;
}

export function parseDurationLimit(obj: unknown): DurationLimit | null {
  let durationLimit: DurationLimit | null = null;
  if (isDurationLimit(obj)) durationLimit = obj;
  return durationLimit;
}

export const validateDurationLimitOrder = (input: DurationLimit) => {
  const validationOrderKeys = ["PER_DAY", "PER_WEEK", "PER_MONTH", "PER_YEAR"];
  return validateLimitOrder(input, validationOrderKeys);
};
