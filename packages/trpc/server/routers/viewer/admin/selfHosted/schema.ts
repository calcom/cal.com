import { z } from "zod";

// Pagination schemas
export const ZPaginationSchema = z.object({
  page: z.number().min(1).optional().default(1),
  limit: z.number().min(1).max(100).optional().default(20),
});

export const ZDateRangeSchema = z.object({
  startDate: z.string(), // ISO 8601
  endDate: z.string(), // ISO 8601
});

// List deployments
export const ZListDeploymentsInputSchema = ZPaginationSchema.extend({
  billingEmail: z.string().optional(),
  customerId: z.string().optional(),
  createdAtFrom: z.string().optional(),
  createdAtTo: z.string().optional(),
  hasActiveKeys: z.boolean().optional(),
});

export type TListDeploymentsInput = z.infer<typeof ZListDeploymentsInputSchema>;

// Get deployment keys
export const ZGetDeploymentKeysInputSchema = z.object({
  deploymentId: z.string().uuid(),
  page: z.number().min(1).optional().default(1),
  limit: z.number().min(1).max(100).optional().default(20),
});

export type TGetDeploymentKeysInput = z.infer<
  typeof ZGetDeploymentKeysInputSchema
>;

// Get deployment usage
export const ZGetDeploymentUsageInputSchema = z.object({
  deploymentId: z.string().uuid(),
  startDate: z.string(),
  endDate: z.string(),
});

export type TGetDeploymentUsageInput = z.infer<
  typeof ZGetDeploymentUsageInputSchema
>;

// Get key usage
export const ZGetKeyUsageInputSchema = z.object({
  keyId: z.string().uuid(),
  startDate: z.string(),
  endDate: z.string(),
});

export type TGetKeyUsageInput = z.infer<typeof ZGetKeyUsageInputSchema>;

// Regenerate signature token
export const ZRegenerateSignatureInputSchema = z.object({
  deploymentId: z.string().uuid(),
});

export type TRegenerateSignatureInput = z.infer<
  typeof ZRegenerateSignatureInputSchema
>;
