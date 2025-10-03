import { z } from "zod";

export const ZAdminGetTeamBillingSchema = z.object({
  id: z.number(),
});

export type TAdminGetTeamBilling = z.infer<typeof ZAdminGetTeamBillingSchema>;
