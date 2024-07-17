import { z } from "zod";

import slugify from "@calcom/lib/slugify";

export enum BillingPeriod {
  MONTHLY = "MONTHLY",
  ANNUALLY = "ANNUALLY",
}

export const ZCreateInputSchema = z.object({
  name: z.string(),
  slug: z.string().transform((val) => slugify(val.trim())),
  orgOwnerEmail: z.string().email(),
  language: z.string().optional(),
  seats: z.number().optional(),
  pricePerSeat: z.number().optional(),
  isPlatform: z.boolean().default(false),
  billingPeriod: z.nativeEnum(BillingPeriod).default(BillingPeriod.MONTHLY).optional(),
});

export type TCreateInputSchema = z.infer<typeof ZCreateInputSchema>;
