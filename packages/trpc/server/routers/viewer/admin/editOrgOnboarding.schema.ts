import { z } from "zod";

export const ZEditOrgOnboardingSchema = z.object({
  id: z.string(),
  data: z.object({
    name: z.string().optional(),
    slug: z.string().optional(),
    orgOwnerEmail: z.string().email().optional(),
    billingPeriod: z.enum(["MONTHLY", "ANNUALLY"]).optional(),
    billingMode: z.enum(["SEATS", "ACTIVE_USERS"]).optional(),
    pricePerSeat: z.number().optional(),
    seats: z.number().int().positive().optional(),
    minSeats: z.number().int().positive().nullish(),
    isPlatform: z.boolean().optional(),
    isComplete: z.boolean().optional(),
    isDomainConfigured: z.boolean().optional(),
    logo: z.string().nullish(),
    bio: z.string().nullish(),
    brandColor: z.string().nullish(),
    bannerUrl: z.string().nullish(),
    error: z.string().nullish(),
  }),
});

export type TEditOrgOnboardingSchema = z.infer<typeof ZEditOrgOnboardingSchema>;
