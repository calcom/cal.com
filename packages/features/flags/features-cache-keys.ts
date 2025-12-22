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
 * Type-safe cache entry descriptor that pairs a key builder with its Zod schema.
 * This ensures serialization/parsing is always done with the correct schema for each key.
 */
export type CacheEntry<T, Args extends unknown[] = []> = {
  key: (...args: Args) => string;
  schema: z.ZodType<T>;
};

/**
 * Infer the data type from a CacheEntry
 */
export type CacheEntryData<E> = E extends CacheEntry<infer T, unknown[]> ? T : never;

/**
 * Infer the args type from a CacheEntry
 */
export type CacheEntryArgs<E> = E extends CacheEntry<unknown, infer Args> ? Args : never;

const PREFIX = "features";

/**
 * Cache entries for features caching.
 * Each entry pairs a key builder with its Zod schema for type-safe serialization/parsing.
 *
 * Strategy: Per-entity canonical caches with exact key invalidation.
 * - No cache buster needed - invalidation is done via exact DEL
 * - Batch methods compose from per-entity caches
 * - Global/cross-entity data uses TTL-only (no explicit invalidation)
 */
export const FeaturesCacheEntries = {
  /** Cache entry for a user's feature states (all features for this user) */
  userFeatureStates: {
    key: (userId: number) => `${PREFIX}:userFeatureStates:${userId}`,
    schema: FeatureStatesMapSchema,
  } satisfies CacheEntry<Record<string, FeatureState>, [number]>,

  /** Cache entry for a team's feature states (all features for this team) */
  teamFeatureStates: {
    key: (teamId: number) => `${PREFIX}:teamFeatureStates:${teamId}`,
    schema: FeatureStatesMapSchema,
  } satisfies CacheEntry<Record<string, FeatureState>, [number]>,

  /** Cache entry for a user's auto opt-in setting */
  userAutoOptIn: {
    key: (userId: number) => `${PREFIX}:userAutoOptIn:${userId}`,
    schema: BooleanSchema,
  } satisfies CacheEntry<boolean, [number]>,

  /** Cache entry for a team's auto opt-in setting */
  teamAutoOptIn: {
    key: (teamId: number) => `${PREFIX}:teamAutoOptIn:${teamId}`,
    schema: BooleanSchema,
  } satisfies CacheEntry<boolean, [number]>,

  /** Cache entry for global feature enabled check (TTL-only) */
  globalFeature: {
    key: (slug: FeatureId) => `${PREFIX}:globalFeature:${slug}`,
    schema: BooleanSchema,
  } satisfies CacheEntry<boolean, [FeatureId]>,

  /** Cache entry for teams with feature enabled (TTL-only) */
  teamsWithFeatureEnabled: {
    key: (slug: FeatureId) => `${PREFIX}:teamsWithFeature:${slug}`,
    schema: NumberArraySchema,
  } satisfies CacheEntry<number[], [FeatureId]>,
} as const;

/**
 * Legacy class for backward compatibility - delegates to FeaturesCacheEntries
 * @deprecated Use FeaturesCacheEntries directly for type-safe caching
 */
export class FeaturesCacheKeys {
  static userFeatureStates(userId: number): string {
    return FeaturesCacheEntries.userFeatureStates.key(userId);
  }

  static teamFeatureStates(teamId: number): string {
    return FeaturesCacheEntries.teamFeatureStates.key(teamId);
  }

  static userAutoOptIn(userId: number): string {
    return FeaturesCacheEntries.userAutoOptIn.key(userId);
  }

  static teamAutoOptIn(teamId: number): string {
    return FeaturesCacheEntries.teamAutoOptIn.key(teamId);
  }

  static globalFeature(slug: FeatureId): string {
    return FeaturesCacheEntries.globalFeature.key(slug);
  }

  static teamsWithFeatureEnabled(slug: FeatureId): string {
    return FeaturesCacheEntries.teamsWithFeatureEnabled.key(slug);
  }
}
