import { z } from "zod";

import { FeatureType } from "@calcom/prisma/client";

import type { FeatureId } from "./config";

/**
 * Zod schemas for cached values
 */
const FeatureStateSchema = z.enum(["enabled", "disabled", "inherit"]);
const FeatureStatesMapSchema = z.record(z.string(), FeatureStateSchema);
const BooleanSchema = z.boolean();
const NumberArraySchema = z.array(z.number());
const NullableDateSchema = z.preprocess((value) => {
  if (value === null || value === undefined) {
    return value;
  }
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }
  return value;
}, z.date().nullable());

const FeatureSchema = z.object({
  slug: z.string(),
  enabled: z.boolean(),
  description: z.string().nullable(),
  type: z.nativeEnum(FeatureType).nullable(),
  stale: z.boolean().nullable(),
  lastUsedAt: NullableDateSchema,
  createdAt: NullableDateSchema,
  updatedAt: NullableDateSchema,
  updatedBy: z.number().nullable(),
});
const FeatureListSchema = z.array(FeatureSchema);

/**
 * A bound cache entry with a pre-computed key and its Zod schema.
 * This is returned by FeaturesCacheEntries functions.
 */
export type CacheEntry<T> = {
  key: string;
  schema: z.ZodType<T, z.ZodTypeDef, unknown>;
};

const PREFIX = "features";

/**
 * Cache entries for features caching.
 * Each entry is a function that returns a bound cache entry with a pre-computed key.
 *
 * Strategy: Per-entity canonical caches with exact key invalidation.
 * - No cache buster needed - invalidation is done via exact DEL
 * - Batch methods compose from per-entity caches
 * - Global/cross-entity data uses TTL-only (no explicit invalidation)
 */
export const FeaturesCacheEntries = {
  /** Cache entry for all features (TTL-only) */
  allFeatures: () => ({
    key: `${PREFIX}:allFeatures`,
    schema: FeatureListSchema,
  }),

  /** Cache entry for a user's feature states (all features for this user) */
  userFeatureStates: (userId: number) => ({
    key: `${PREFIX}:userFeatureStates:${userId}`,
    schema: FeatureStatesMapSchema,
  }),

  /** Cache entry for a team's feature states (all features for this team) */
  teamFeatureStates: (teamId: number) => ({
    key: `${PREFIX}:teamFeatureStates:${teamId}`,
    schema: FeatureStatesMapSchema,
  }),

  /** Cache entry for a user's auto opt-in setting */
  userAutoOptIn: (userId: number) => ({
    key: `${PREFIX}:userAutoOptIn:${userId}`,
    schema: BooleanSchema,
  }),

  /** Cache entry for a team's auto opt-in setting */
  teamAutoOptIn: (teamId: number) => ({
    key: `${PREFIX}:teamAutoOptIn:${teamId}`,
    schema: BooleanSchema,
  }),

  /** Cache entry for global feature enabled check (TTL-only) */
  globalFeature: (slug: FeatureId) => ({
    key: `${PREFIX}:globalFeature:${slug}`,
    schema: BooleanSchema,
  }),

  /** Cache entry for teams with feature enabled (TTL-only) */
  teamsWithFeatureEnabled: (slug: FeatureId) => ({
    key: `${PREFIX}:teamsWithFeature:${slug}`,
    schema: NumberArraySchema,
  }),
};
