import { z } from "zod";

export type TGetAttributesForTeamInputSchema = {
  teamId: number;
};

export const ZGetAttributesForTeamInputSchema: z.ZodType<TGetAttributesForTeamInputSchema> = z.object({
  teamId: z.number(),
});
