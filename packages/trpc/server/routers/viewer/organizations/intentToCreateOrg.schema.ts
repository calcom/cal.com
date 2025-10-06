import { z } from "zod";

import { emailSchema } from "@calcom/lib/emailSchema";
import slugify from "@calcom/lib/slugify";
import { CreationSource } from "@calcom/prisma/enums";

export enum BillingPeriod {
  MONTHLY = "MONTHLY",
  ANNUALLY = "ANNUALLY",
}

export const ZIntentToCreateOrgInputSchema = z.object({
  name: z.string(),
  slug: z.string().transform((val) => slugify(val.trim())),
  orgOwnerEmail: emailSchema,
  language: z.string().optional(),
  seats: z.number().nullish(),
  pricePerSeat: z.number().nullish(),
  isPlatform: z.boolean().default(false),
  billingPeriod: z.nativeEnum(BillingPeriod).default(BillingPeriod.MONTHLY),
  creationSource: z.nativeEnum(CreationSource),
  // Brand fields
  logo: z.string().nullish(),
  bio: z.string().nullish(),
  brandColor: z.string().nullish(),
  bannerUrl: z.string().nullish(),
});

export type TIntentToCreateOrgInputSchema = z.infer<typeof ZIntentToCreateOrgInputSchema>;
