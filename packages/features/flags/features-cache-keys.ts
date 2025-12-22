import { z } from "zod";

import type { FeatureId, FeatureState } from "./config";

/**
 * Zod schemas for cached values
 */
const FeatureStateSchema = z.enum(["enabled", "disabled", "inherit"]);
const FeatureStatesMapSchema = z.record(z.string(), FeatureStateSchema);
const BooleanSchema = z.boolean();
const NumberArraySchema = z.array(z.number());

/**
 * A bound cache entry with a pre-computed key and its Zod schema.
 * This is returned by FeaturesCacheEntries functions.
 */
export type CacheEntry<T> = {
  key: string;
  schema: z.ZodType<T>;
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
  /** Cache entry for a user's feature states (all features for this user) */
  userFeatureStates: (userId: number): CacheEntry<Record<string, FeatureState>> => ({
    key: `${PREFIX}:userFeatureStates:${userId}`,
    schema: FeatureStatesMapSchema,
  }),

  /** Cache entry for a team's feature states (all features for this team) */
  teamFeatureStates: (teamId: number): CacheEntry<Record<string, FeatureState>> => ({
    key: `${PREFIX}:teamFeatureStates:${teamId}`,
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
