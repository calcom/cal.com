import { z } from "zod";

export const ZGetAttributesForTeamInputSchema = z.object({
  teamId: z.number(),
});

export type TGetAttributesForTeamInputSchema = z.infer<typeof ZGetAttributesForTeamInputSchema>;
