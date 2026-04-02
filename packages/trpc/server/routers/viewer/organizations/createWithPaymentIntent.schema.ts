/**
 * @deprecated This schema is deprecated. Use ZIntentToCreateOrgInputSchema instead.
 * See createWithPaymentIntent.handler.ts for migration guide.
 */

import { createOrganizationSchema } from "@calcom/features/ee/organizations/types/schemas";
import type { z } from "zod";

export enum BillingPeriod {
  MONTHLY = "MONTHLY",
  ANNUALLY = "ANNUALLY",
}

/**
 * @deprecated Use ZIntentToCreateOrgInputSchema instead
 */
export const ZCreateWithPaymentIntentInputSchema = createOrganizationSchema;

export type TCreateWithPaymentIntentInputSchema = z.infer<typeof ZCreateWithPaymentIntentInputSchema>;
