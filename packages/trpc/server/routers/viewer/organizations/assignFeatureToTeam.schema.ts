import { z } from "zod";

export const ZAssignFeatureToTeamSchema = z.object({
  teamId: z.number(),
  featureId: z.string(),
});

export type TAssignFeatureToTeamSchema = z.infer<typeof ZAssignFeatureToTeamSchema>;
