import type { ZodObject, ZodTypeAny } from "zod";
import { z } from "zod";

export const UserFeaturesDtoSchema: ZodObject<{
  userId: ZodTypeAny;
  featureId: ZodTypeAny;
  enabled: ZodTypeAny;
  assignedBy: ZodTypeAny;
  updatedAt: ZodTypeAny;
}> = z.object({
  userId: z.number(),
  featureId: z.string(),
  enabled: z.boolean(),
  assignedBy: z.string(),
  updatedAt: z.coerce.date(),
});

export type UserFeaturesDto = z.infer<typeof UserFeaturesDtoSchema>;
