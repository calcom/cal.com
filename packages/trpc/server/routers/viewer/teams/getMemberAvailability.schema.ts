import { timeZoneSchema } from "@calcom/lib/dayjs/timeZone.schema";
import { z } from "zod";

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
