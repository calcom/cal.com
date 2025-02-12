import { z } from "zod";

import slugify from "@calcom/lib/slugify";

export enum BillingPeriod {
  MONTHLY = "MONTHLY",
  ANNUALLY = "ANNUALLY",
}

// Base user schema - fields that any user can set
export const ZCreateUserInputSchema = z.object({
  name: z.string(),
  slug: z.string().transform((val) => slugify(val.trim())),
  orgOwnerEmail: z.string().email(),
  language: z.string().optional(),
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

// Admin-only schema - fields that only admins can set
export const ZCreateAdminInputSchema = z.object({
  seats: z.number().nullish(),
  pricePerSeat: z.number().nullish(),
  billingPeriod: z.nativeEnum(BillingPeriod).default(BillingPeriod.MONTHLY),
});

// Combined schema for creating with payment intent
export const ZCreateWithPaymentIntentInputSchema = ZCreateUserInputSchema.merge(
  ZCreateAdminInputSchema.partial()
);

export type TCreateUserInputSchema = z.infer<typeof ZCreateUserInputSchema>;
export type TCreateAdminInputSchema = z.infer<typeof ZCreateAdminInputSchema>;
export type TCreateWithPaymentIntentInputSchema = z.infer<typeof ZCreateWithPaymentIntentInputSchema>;
