import { z } from "zod";

import { timeZoneSchema } from "@calcom/lib/dayjs/timeZone.schema";

// Define type first to use with z.ZodType annotation
// This prevents full Zod generic tree from being emitted in .d.ts files
export type TGetMemberAvailabilityInputSchema = {
  teamId: number;
  memberId: number;
  timezone: string;
  dateFrom: string;
  dateTo: string;
};

export const ZGetMemberAvailabilityInputSchema: z.ZodType<TGetMemberAvailabilityInputSchema> = z.object({
  teamId: z.number(),
  memberId: z.number(),
  timezone: timeZoneSchema,
  dateFrom: z.string(),
  dateTo: z.string(),
});
