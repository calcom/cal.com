import { z } from "zod";

export const ZDeleteTeamInputSchema = z.object({
  teamId: z.number(),
});

export type TDeleteTeamInputSchema = z.infer<typeof ZDeleteTeamInputSchema>;
