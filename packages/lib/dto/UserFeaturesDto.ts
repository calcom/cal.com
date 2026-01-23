import { z } from "zod";

export const UserFeaturesDtoSchema = z.object({
  userId: z.number(),
  featureId: z.string(),
  enabled: z.boolean(),
  assignedBy: z.string(),
  updatedAt: z.coerce.date(),
});

export type UserFeaturesDto = z.infer<typeof UserFeaturesDtoSchema>;
