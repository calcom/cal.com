import { FeatureType, type Feature } from "@calcom/prisma/client";
import { z } from "zod";

import type { FeatureId, FeatureState } from "./config";

/**
 * Zod schemas for cached values
 */
const FeatureStateSchema: z.ZodType<FeatureState> = z.enum(["enabled", "disabled", "inherit"]);
const FeatureStatesMapSchema: z.ZodType<Record<string, FeatureState>> = z.record(
  z.string(),
  FeatureStateSchema
);
const BooleanSchema: z.ZodType<boolean> = z.boolean();
const NumberArraySchema: z.ZodType<number[]> = z.array(z.number());
const NullableDateSchema: z.ZodType<Date | null, z.ZodTypeDef, unknown> = z.preprocess((value) => {
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

const FeatureSchema: z.ZodType<Feature, z.ZodTypeDef, unknown> = z.object({
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
const FeatureListSchema: z.ZodType<Feature[], z.ZodTypeDef, unknown> = z.array(FeatureSchema);

const PREFIX = "features";

/**
 * Normalize featureIds for use in cache keys.
 * Deduplicates and sorts to ensure consistent key generation regardless of input order.
 */
function normalizeFeatureIds(featureIds: FeatureId[]): string {
  return Array.from(new Set(featureIds)).sort().join(",");
}

/**
 * A bound cache entry with a pre-computed key and its Zod schema.
 * This is returned by FeaturesCacheEntries functions.
 */
export type CacheEntry<T> = {
  key: string;
  schema: z.ZodType<T, z.ZodTypeDef, unknown>;
};

/**
 * Cache entries for features caching.
 * Each entry is a function that returns a bound cache entry with a pre-computed key.
 *
 * Strategy:
 * - Composite keys for batch methods (userId/teamId + featureIds)
 * - TTL-only invalidation for composite keys (no explicit invalidation on mutations)
 * - Per-entity caches for single-value lookups with exact key invalidation
 */
export const FeaturesCacheEntries = {
  /** Cache entry for all features (TTL-only) */
  allFeatures: (): CacheEntry<Feature[]> => ({
    key: `${PREFIX}:allFeatures`,
    schema: FeatureListSchema,
  }),

  /** Cache entry for a user's feature states for specific featureIds */
  userFeatureStates: (userId: number, featureIds: FeatureId[]): CacheEntry<Record<string, FeatureState>> => ({
    key: `${PREFIX}:userFeatureStates:${userId}:${normalizeFeatureIds(featureIds)}`,
    schema: FeatureStatesMapSchema,
  }),

  /** Cache entry for a team's feature states for specific featureIds */
  teamFeatureStates: (teamId: number, featureIds: FeatureId[]): CacheEntry<Record<string, FeatureState>> => ({
    key: `${PREFIX}:teamFeatureStates:${teamId}:${normalizeFeatureIds(featureIds)}`,
    schema: FeatureStatesMapSchema,
  }),

  /** Cache entry for a user's auto opt-in setting */
  userAutoOptIn: (userId: number): CacheEntry<boolean> => ({
    key: `${PREFIX}:userAutoOptIn:${userId}`,
    schema: BooleanSchema,
  }),

  /** Cache entry for a team's auto opt-in setting */
  teamAutoOptIn: (teamId: number): CacheEntry<boolean> => ({
    key: `${PREFIX}:teamAutoOptIn:${teamId}`,
    schema: BooleanSchema,
  }),

  /** Cache entry for global feature enabled check (TTL-only) */
  globalFeature: (slug: FeatureId): CacheEntry<boolean> => ({
    key: `${PREFIX}:globalFeature:${slug}`,
    schema: BooleanSchema,
  }),

  /** Cache entry for teams with feature enabled (TTL-only) */
  teamsWithFeatureEnabled: (slug: FeatureId): CacheEntry<number[]> => ({
    key: `${PREFIX}:teamsWithFeature:${slug}`,
    schema: NumberArraySchema,
  }),
};
