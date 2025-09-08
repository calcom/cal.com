import { z } from "zod";

export const ZGetOtherTeamInputSchema = z.object({
  teamId: z.number(),
});

export type TGetOtherTeamInputSchema = z.infer<typeof ZGetOtherTeamInputSchema>;
