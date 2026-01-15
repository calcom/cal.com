/**
 * @deprecated This schema is deprecated. Use ZIntentToCreateOrgInputSchema instead.
 * See createWithPaymentIntent.handler.ts for migration guide.
 */
import type { z } from "zod";

import { createOrganizationSchema } from "@calcom/features/ee/organizations/types/schemas";

export enum BillingPeriod {
  MONTHLY = "MONTHLY",
  ANNUALLY = "ANNUALLY",
}

/**
 * @deprecated Use ZIntentToCreateOrgInputSchema instead
 */
export const ZCreateWithPaymentIntentInputSchema = createOrganizationSchema;

export type TCreateWithPaymentIntentInputSchema = z.infer<typeof ZCreateWithPaymentIntentInputSchema>;
