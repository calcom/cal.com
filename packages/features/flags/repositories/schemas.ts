import { z } from "zod";

const dateSchema = z.union([z.date(), z.string().transform((str) => new Date(str))]);

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
