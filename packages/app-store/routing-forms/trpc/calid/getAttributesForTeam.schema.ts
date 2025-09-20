import { z } from "zod";

export const ZCalIdGetAttributesForTeamInputSchema = z.object({
  teamId: z.number(),
});

export type TCalIdGetAttributesForTeamInputSchema = z.infer<typeof ZCalIdGetAttributesForTeamInputSchema>;
