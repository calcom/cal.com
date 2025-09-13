import { z } from "zod";

export const ZGetAttributesForCalIdTeamInputSchema = z.object({
  calIdTeamId: z.number(),
});

export type TGetAttributesForCalIdTeamInputSchema = z.infer<typeof ZGetAttributesForCalIdTeamInputSchema>;
