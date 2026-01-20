import { z } from "zod";

export const ZGetTeamBillingInfoInputSchema = z.object({
  teamId: z.number(),
});

export type TGetTeamBillingInfoInputSchema = z.infer<typeof ZGetTeamBillingInfoInputSchema>;
