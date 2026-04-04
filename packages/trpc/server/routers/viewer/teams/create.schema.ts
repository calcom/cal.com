import { z } from "zod";

import slugify from "@calcom/lib/slugify";
import type { BillingPeriod } from "@calcom/prisma/enums";

export type TCreateInputSchema = {
  name: string;
  slug: string;
  logo?: string | null;
  bio?: string;
  isOnboarding?: boolean;
  billingPeriod?: BillingPeriod;
};

export const ZCreateInputSchema: z.ZodType<TCreateInputSchema> = z.object({
  name: z.string(),
  slug: z.string().transform((val) => slugify(val.trim())),
  logo: z
    .string()
    .optional()
    .nullable()
    .transform((v) => v || null),
  bio: z.string().optional(),
  isOnboarding: z.boolean().optional(),
  billingPeriod: z.enum(["MONTHLY", "ANNUALLY"]).optional(),
});
