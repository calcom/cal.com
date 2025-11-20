import { z } from "zod";

export const ZToggleTeamFeatureSchema = z.object({
  teamId: z.number(),
  featureSlug: z.string(),
  enabled: z.boolean(),
});

export type TToggleTeamFeatureSchema = z.infer<typeof ZToggleTeamFeatureSchema>;
