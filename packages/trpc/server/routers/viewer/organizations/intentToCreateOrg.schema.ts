import { z } from "zod";

import { emailSchema } from "@calcom/lib/emailSchema";
import slugify from "@calcom/lib/slugify";
import { BillingMode, BillingPeriod, CreationSource } from "@calcom/prisma/enums";
import { orgOnboardingInvitedMembersSchema, orgOnboardingTeamsSchema } from "@calcom/prisma/zod-utils";

export const ZIntentToCreateOrgInputSchema = z.object({
  name: z.string(),
  slug: z.string().transform((val) => slugify(val.trim())),
  orgOwnerEmail: emailSchema,
  language: z.string().optional(),
  seats: z.number().nullish(),
  pricePerSeat: z.number().nullish(),
  isPlatform: z.boolean().default(false),
  billingPeriod: z.nativeEnum(BillingPeriod).default(BillingPeriod.MONTHLY),
  billingMode: z.nativeEnum(BillingMode).default(BillingMode.SEATS),
  minSeats: z.number().int().positive().nullish(),
  creationSource: z.nativeEnum(CreationSource),
  // Brand fields
  logo: z.string().nullish(),
  bio: z.string().nullish(),
  brandColor: z.string().nullish(),
  bannerUrl: z.string().nullish(),
  // Teams and invites (new)
  teams: orgOnboardingTeamsSchema.optional(),
  invitedMembers: orgOnboardingInvitedMembersSchema.optional(),
  // Optional onboarding ID for resume flows (admin handover)
  onboardingId: z.string().optional(),
});

export type TIntentToCreateOrgInputSchema = z.infer<typeof ZIntentToCreateOrgInputSchema>;
