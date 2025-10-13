import { z } from "zod";

import { intervalLimitsType } from "@calcom/lib/intervalLimits/intervalLimitSchema";

export const ZUpdateMembershipBookingLimitsInputSchema = z.object({
  userId: z.number(),
  teamId: z.number(),
  bookingLimits: intervalLimitsType,
});

export type TUpdateMembershipBookingLimitsInputSchema = z.infer<
  typeof ZUpdateMembershipBookingLimitsInputSchema
>;
