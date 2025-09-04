import { z } from "zod";

export const ZTeamRemoveFeatureSchema = z.object({
  teamId: z.number(),
  featureId: z.string(),
});

export type TTeamRemoveFeatureSchema = z.infer<typeof ZTeamRemoveFeatureSchema>;
