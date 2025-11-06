import { z } from "zod";

export const ZListDeploymentsSchema = z.object({
  page: z.number().min(1).optional().default(1),
  pageSize: z.number().min(1).max(100).optional().default(20),
  billingEmail: z.string().optional(),
  customerId: z.string().optional(),
  keyActive: z.boolean().optional(),
  createdAfter: z.string().optional(),
  createdBefore: z.string().optional(),
});
