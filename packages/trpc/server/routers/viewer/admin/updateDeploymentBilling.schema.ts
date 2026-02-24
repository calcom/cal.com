import { z } from "zod";

export const ZUpdateDeploymentBillingSchema = z.object({
  email: z.string().email(),
  newEmail: z.string().email().optional(),
  customerId: z.string().optional(),
  subscriptionId: z.string().optional(),
});

export type TUpdateDeploymentBillingSchema = z.infer<typeof ZUpdateDeploymentBillingSchema>;
