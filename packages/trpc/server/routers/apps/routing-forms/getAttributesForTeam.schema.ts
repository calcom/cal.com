import { z } from "zod";

export type TGetAttributesForTeamInputSchema = {
  teamId: number;
};

export const ZGetAttributesForTeamInputSchema = z.object({
  teamId: z.number(),
});
