import { z } from "zod";

import { emailRegex } from "@calcom/prisma/zod-utils";

const BillingType = z.enum(["PER_BOOKING", "PER_USER"]);
const BillingPeriod = z.enum(["MONTHLY", "ANNUALLY"]);

export const ZCreateSelfHostedLicenseSchema = z.object({
  billingType: BillingType,
  entityCount: z.number().int().nonnegative(),
  entityPrice: z.number().nonnegative(),
  billingPeriod: BillingPeriod,
  overages: z.number().nonnegative(),
  billingEmail: z.string().regex(emailRegex),
});

export type TCreateSelfHostedLicenseSchema = z.infer<typeof ZCreateSelfHostedLicenseSchema>;
