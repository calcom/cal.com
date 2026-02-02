import { z } from "zod";

export const ZAdminAssignFeatureToTeamSchema = z.object({
  teamId: z.number(),
  featureId: z.string(),
});

export type TAdminAssignFeatureToTeamSchema = z.infer<typeof ZAdminAssignFeatureToTeamSchema>;
