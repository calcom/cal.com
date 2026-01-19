import { z } from "zod";

import { BillingCurrency } from "@calcom/prisma/zod-utils";

export const ZUpdateBillingCurrencyInputSchema = z.object({
  teamId: z.number(),
  billingCurrency: z.nativeEnum(BillingCurrency),
});

export type TUpdateBillingCurrencyInputSchema = z.infer<typeof ZUpdateBillingCurrencyInputSchema>;
