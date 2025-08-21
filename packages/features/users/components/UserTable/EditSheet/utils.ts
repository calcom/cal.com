import { intervalLimitsType } from "@calcom/lib/intervalLimits/intervalLimitSchema";

export function validateBookingLimits(data: unknown) {
  const result = intervalLimitsType.safeParse(data);
  return result.success ? result.data : undefined;
}
