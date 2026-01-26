import { z } from "zod";

export const TeamFeaturesDtoSchema = z.object({
  teamId: z.number(),
  featureId: z.string(),
  enabled: z.boolean(),
  assignedBy: z.string(),
  updatedAt: z.coerce.date(),
});

export type TeamFeaturesDto = z.infer<typeof TeamFeaturesDtoSchema>;
