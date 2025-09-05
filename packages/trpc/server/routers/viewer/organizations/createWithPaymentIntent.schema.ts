import { createOrganizationSchema } from "@calcom/features/ee/organizations/types/schemas";
import type { z } from "zod";

export enum BillingPeriod {
  MONTHLY = "MONTHLY",
  ANNUALLY = "ANNUALLY",
}

export const ZCreateWithPaymentIntentInputSchema = createOrganizationSchema;

export type TCreateWithPaymentIntentInputSchema = z.infer<typeof ZCreateWithPaymentIntentInputSchema>;
