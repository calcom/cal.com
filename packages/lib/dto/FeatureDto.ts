import type { ZodArray, ZodObject, ZodTypeAny } from "zod";
import { z } from "zod";

export const FeatureDtoSchema: ZodObject<{
  slug: ZodTypeAny;
  enabled: ZodTypeAny;
  description: ZodTypeAny;
  type: ZodTypeAny;
  stale: ZodTypeAny;
  lastUsedAt: ZodTypeAny;
  createdAt: ZodTypeAny;
  updatedAt: ZodTypeAny;
  updatedBy: ZodTypeAny;
}> = z.object({
  slug: z.string(),
  enabled: z.boolean(),
  description: z.string().nullable(),
  type: z.enum(["RELEASE", "EXPERIMENT", "OPERATIONAL", "PERMISSION", "KILL_SWITCH"]).nullable(),
  stale: z.boolean().nullable(),
  lastUsedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date().nullable(),
  updatedAt: z.coerce.date().nullable(),
  updatedBy: z.number().nullable(),
});

export type FeatureDto = z.infer<typeof FeatureDtoSchema>;

export const FeatureDtoArraySchema: ZodArray<typeof FeatureDtoSchema> = z.array(FeatureDtoSchema);
