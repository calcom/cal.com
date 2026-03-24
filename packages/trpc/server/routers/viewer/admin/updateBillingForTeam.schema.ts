import { z } from "zod";

export const ZUpdateBillingForTeamSchema = z.object({
  teamId: z.number().int().positive(),
  billingMode: z.enum(["SEATS", "ACTIVE_USERS"]).optional(),
  pricePerSeat: z.number().int().min(0).optional(),
  paidSeats: z.number().int().min(0).optional(),
});

export type TUpdateBillingForTeamSchema = z.infer<typeof ZUpdateBillingForTeamSchema>;
