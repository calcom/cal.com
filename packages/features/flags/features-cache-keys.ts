import type { FeatureId } from "./config";

/**
 * Cache key factory for features caching.
 *
 * Strategy: Per-entity canonical caches with exact key invalidation.
 * - No cache buster needed - invalidation is done via exact DEL
 * - Batch methods compose from per-entity caches
 * - Global/cross-entity data uses TTL-only (no explicit invalidation)
 */
export class FeaturesCacheKeys {
  private static readonly PREFIX = "features";

  // === Per-entity canonical caches (invalidated via exact DEL) ===

  /** Cache key for a user's feature states (all features for this user) */
  static userFeatureStates(userId: number): string {
    return `${this.PREFIX}:userFeatureStates:${userId}`;
  }

  /** Cache key for a team's feature states (all features for this team) */
  static teamFeatureStates(teamId: number): string {
    return `${this.PREFIX}:teamFeatureStates:${teamId}`;
  }

  /** Cache key for a user's auto opt-in setting */
  static userAutoOptIn(userId: number): string {
    return `${this.PREFIX}:userAutoOptIn:${userId}`;
  }

  /** Cache key for a team's auto opt-in setting */
  static teamAutoOptIn(teamId: number): string {
    return `${this.PREFIX}:teamAutoOptIn:${teamId}`;
  }

  // === TTL-only caches (no explicit invalidation, controlled at DB level) ===

  /** Cache key for global feature enabled check (TTL-only) */
  static globalFeature(slug: FeatureId): string {
    return `${this.PREFIX}:globalFeature:${slug}`;
  }

  /** Cache key for teams with feature enabled (TTL-only) */
  static teamsWithFeatureEnabled(slug: FeatureId): string {
    return `${this.PREFIX}:teamsWithFeature:${slug}`;
  }
}
