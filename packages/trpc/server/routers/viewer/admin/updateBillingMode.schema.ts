import { z } from "zod";

export const ZUpdateBillingModeSchema = z.object({
  billingId: z.string(),
  entityType: z.enum(["team", "organization"]),
  billingMode: z.enum(["SEATS", "ACTIVE_USERS"]),
  minSeats: z.number().int().min(0).nullable(),
  pricePerSeat: z.number().int().min(0).nullable(),
});

export type TUpdateBillingModeSchema = z.infer<typeof ZUpdateBillingModeSchema>;
