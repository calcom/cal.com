import { z } from "zod";

export const ZUnassignFeatureFromTeamSchema = z.object({
  teamId: z.number(),
  featureId: z.string(),
});

export type TUnassignFeatureFromTeamSchema = z.infer<typeof ZUnassignFeatureFromTeamSchema>;
