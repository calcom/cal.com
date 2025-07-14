import type { z } from "zod";

import { createOrganizationSchema } from "@calcom/features/ee/organizations/types/schemas";

export enum BillingPeriod {
  MONTHLY = "MONTHLY",
  ANNUALLY = "ANNUALLY",
}

export const ZCreateWithPaymentIntentInputSchema = createOrganizationSchema;

export type TCreateWithPaymentIntentInputSchema = z.infer<typeof ZCreateWithPaymentIntentInputSchema>;
