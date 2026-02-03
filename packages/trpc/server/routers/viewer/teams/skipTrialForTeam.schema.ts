import { z } from "zod";

export const ZSkipTrialForTeamInputSchema = z.object({
  teamId: z.number(),
});

export type TSkipTrialForTeamInputSchema = z.infer<typeof ZSkipTrialForTeamInputSchema>;
