import type { ZodBoolean, ZodDate, ZodObject, ZodNumber, ZodString } from "zod";
import { z } from "zod";

const dateSchema: ZodDate = z.coerce.date();

export const userFeaturesSchema: ZodObject<{
  userId: ZodNumber;
  featureId: ZodString;
  enabled: ZodBoolean;
  assignedBy: ZodString;
  assignedAt: ZodDate;
  updatedAt: ZodDate;
}> = z.object({
  userId: z.number(),
  featureId: z.string(),
  enabled: z.boolean(),
  assignedBy: z.string(),
  assignedAt: dateSchema,
  updatedAt: dateSchema,
});

export type CachedUserFeatures = z.infer<typeof userFeaturesSchema>;

export const booleanSchema: ZodBoolean = z.boolean();
