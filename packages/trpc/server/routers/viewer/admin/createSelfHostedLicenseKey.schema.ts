import { z } from "zod";

import { emailSchema } from "@calcom/lib/emailSchema";

const BillingType = z.enum(["PER_BOOKING", "PER_USER"]);
const BillingPeriod = z.enum(["MONTHLY", "ANNUALLY"]);

export const ZCreateSelfHostedLicenseSchema = z.object({
  billingType: BillingType,
  entityCount: z.number().int().nonnegative(),
  entityPrice: z.number().nonnegative(),
  billingPeriod: BillingPeriod,
  overages: z.number().nonnegative(),
  billingEmail: emailSchema,
});

export type TCreateSelfHostedLicenseSchema = z.infer<typeof ZCreateSelfHostedLicenseSchema>;
