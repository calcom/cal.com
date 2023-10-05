import { z } from "zod";

export const ZGetInputSchema = z.object({
  teamId: z.number(),
  includeTeamLogo: z.boolean().optional(),
});

export type TGetInputSchema = z.infer<typeof ZGetInputSchema>;
