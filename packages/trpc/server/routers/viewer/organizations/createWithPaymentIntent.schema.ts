import { z } from "zod";

import slugify from "@calcom/lib/slugify";

export enum BillingPeriod {
  MONTHLY = "MONTHLY",
  ANNUALLY = "ANNUALLY",
}

// Base user schema - fields that any user can set
export const ZCreateWithPaymentIntentInputSchema = z.object({
  language: z.string().optional(),
  logo: z.string().nullish(),
  bio: z.string().nullish(),
  onboardingId: z.string(),
  invitedMembers: z
    .array(
      z.object({
        email: z.string().email(),
        name: z.string().optional(),
      })
    )
    .optional(),
  teams: z
    .array(
      z.object({
        id: z.number(), // New teams are treated as -1
        name: z.string(),
        slug: z
          .string()
          .transform((val) => slugify(val.trim()))
          .nullable(),
        isBeingMigrated: z.boolean(),
      })
    )
    .optional(),
});

export type TCreateWithPaymentIntentInputSchema = z.infer<typeof ZCreateWithPaymentIntentInputSchema>;
