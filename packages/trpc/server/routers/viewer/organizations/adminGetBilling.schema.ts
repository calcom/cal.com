import { z } from "zod";

export const ZAdminGetBilling = z.object({
  id: z.number(),
});

export type TAdminGetBilling = z.infer<typeof ZAdminGetBilling>;
