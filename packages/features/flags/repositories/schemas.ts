import type { ZodObject } from "zod";
import { z } from "zod";

const dateSchema: z.ZodDate = z.coerce.date();
const optionalDateSchema: z.ZodNullable<z.ZodDate> = z.coerce.date().nullable();

export const featureSchema: ZodObject<{
  slug: z.ZodString;
  enabled: z.ZodBoolean;
  description: z.ZodNullable<z.ZodString>;
  type: z.ZodNullable<z.ZodEnum<["RELEASE", "EXPERIMENT", "OPERATIONAL", "PERMISSION", "KILL_SWITCH"]>>;
  stale: z.ZodNullable<z.ZodBoolean>;
  lastUsedAt: z.ZodNullable<z.ZodDate>;
  createdAt: z.ZodNullable<z.ZodDate>;
  updatedAt: z.ZodNullable<z.ZodDate>;
  updatedBy: z.ZodNullable<z.ZodNumber>;
}> = z.object({
  slug: z.string(),
  enabled: z.boolean(),
  description: z.string().nullable(),
  type: z.enum(["RELEASE", "EXPERIMENT", "OPERATIONAL", "PERMISSION", "KILL_SWITCH"]).nullable(),
  stale: z.boolean().nullable(),
  lastUsedAt: optionalDateSchema,
  createdAt: optionalDateSchema,
  updatedAt: optionalDateSchema,
  updatedBy: z.number().nullable(),
});

export type CachedFeature = z.infer<typeof featureSchema>;

export const featureArraySchema = z.array(featureSchema);

export const appFlagsSchema = z.record(z.string(), z.boolean());

export type CachedAppFlags = z.infer<typeof appFlagsSchema>;

export const teamFeaturesMapSchema = z.record(z.string(), z.boolean());

export type CachedTeamFeaturesMap = z.infer<typeof teamFeaturesMapSchema>;

export const teamFeaturesSchema = z.object({
  teamId: z.number(),
  featureId: z.string(),
  enabled: z.boolean(),
  assignedBy: z.string(),
  assignedAt: dateSchema,
  updatedAt: dateSchema,
});

export type CachedTeamFeatures = z.infer<typeof teamFeaturesSchema>;

export const userFeaturesSchema = z.object({
  userId: z.number(),
  featureId: z.string(),
  enabled: z.boolean(),
  assignedBy: z.string(),
  assignedAt: dateSchema,
  updatedAt: dateSchema,
});

export type CachedUserFeatures = z.infer<typeof userFeaturesSchema>;

export const booleanSchema = z.boolean();
