import { z } from "zod";

export const ZUpdateDeploymentSchema = z.object({
  id: z.string().uuid(),
  billingEmail: z.string().email().optional(),
  customerId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  signature: z.string().optional(),
});

export const ZSendLicenseEmailSchema = z.object({
  id: z.string().uuid(),
});

export const ZGetDeploymentStripeInfoSchema = z.object({
  id: z.string().uuid(),
});

export const ZUpdateLicenseKeySchema = z.object({
  id: z.string().uuid(),
  active: z.boolean().optional(),
  skipVerification: z.boolean().optional(),
  subscriptionId: z.string().optional(),
  usageLimits: z
    .object({
      entityCount: z.number().min(0).optional(),
      entityPrice: z.number().min(0).optional(),
      overages: z.number().min(0).optional(),
    })
    .optional(),
});

export const ZGetLicenseKeyStripeInfoSchema = z.object({
  id: z.string().uuid(),
});

