import { z } from "zod";

export const ZGetMemberAvailabilityInputSchema = z.object({
  teamId: z.number(),
  memberId: z.number(),
  timezone: z.string(),
  dateFrom: z.string(),
  dateTo: z.string(),
});

export type TGetMemberAvailabilityInputSchema = z.infer<typeof ZGetMemberAvailabilityInputSchema>;
