import { z } from "zod";

import { timeZoneSchema } from "@calcom/lib/dayjs/timeZone.schema";

export const ZGetMemberAvailabilityInputSchema = z.object({
  teamId: z.number(),
  memberId: z.number(),
  timezone: timeZoneSchema,
  dateFrom: z.string(),
  dateTo: z.string(),
});

export type TGetMemberAvailabilityInputSchema = z.infer<typeof ZGetMemberAvailabilityInputSchema>;
