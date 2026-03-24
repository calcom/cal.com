import { z } from "zod";

export const ZGetBillingForTeamSchema = z.object({
  teamId: z.number().int().positive(),
});

export type TGetBillingForTeamSchema = z.infer<typeof ZGetBillingForTeamSchema>;
