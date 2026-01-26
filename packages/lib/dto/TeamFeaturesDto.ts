import type { ZodObject, ZodTypeAny } from "zod";
import { z } from "zod";

export const TeamFeaturesDtoSchema: ZodObject<{
  teamId: ZodTypeAny;
  featureId: ZodTypeAny;
  enabled: ZodTypeAny;
  assignedBy: ZodTypeAny;
  updatedAt: ZodTypeAny;
}> = z.object({
  teamId: z.number(),
  featureId: z.string(),
  enabled: z.boolean(),
  assignedBy: z.string(),
  updatedAt: z.coerce.date(),
});

export type TeamFeaturesDto = z.infer<typeof TeamFeaturesDtoSchema>;
