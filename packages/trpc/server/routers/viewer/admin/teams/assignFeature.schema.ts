import { z } from "zod";

export const ZTeamAssignFeatureSchema = z.object({
  teamId: z.number(),
  featureId: z.string(),
  confirmationSlug: z.string(),
});

export type TTeamAssignFeatureSchema = z.infer<typeof ZTeamAssignFeatureSchema>;
