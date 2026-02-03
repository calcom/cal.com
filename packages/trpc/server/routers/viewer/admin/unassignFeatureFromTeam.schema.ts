import { z } from "zod";

export const ZAdminUnassignFeatureFromTeamSchema = z.object({
  teamId: z.number(),
  featureId: z.string(),
});

export type TAdminUnassignFeatureFromTeamSchema = z.infer<typeof ZAdminUnassignFeatureFromTeamSchema>;
