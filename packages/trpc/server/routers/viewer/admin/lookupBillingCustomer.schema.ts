import { z } from "zod";

export const ZLookupBillingCustomerSchema = z.object({
  customerId: z.string().min(1),
});

export type TLookupBillingCustomerInput = z.infer<typeof ZLookupBillingCustomerSchema>;
