import { z } from "zod";

export const ZTransferBillingSchema = z.object({
  billingId: z.string().min(1),
  entityType: z.enum(["team", "organization"]),
  newCustomerId: z
    .string()
    .refine((val) => val.startsWith("cus_"), { message: "Customer ID must start with 'cus_'" }),
  newSubscriptionId: z
    .string()
    .refine((val) => val.startsWith("sub_"), { message: "Subscription ID must start with 'sub_'" }),
  mode: z.enum(["preview", "execute"]),
});

export type TTransferBillingInput = z.infer<typeof ZTransferBillingSchema>;
