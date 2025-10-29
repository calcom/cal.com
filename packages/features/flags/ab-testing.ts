import { x86 } from "murmurhash3js-revisited";

/**
 * A/B Testing utility for deterministic user bucketing.
 * Uses MurmurHash3 for uniform distribution of users into buckets.
 *
 * See more:
 * - A/B testing best practices: https://www.optimizely.com/optimization-glossary/ab-testing/
 */

export function getUserBucket(userId: number, featureSlug: string, salt: string = ""): number {
  // Combine userId, feature, and salt into a single string
  const input = `${userId}:${featureSlug}:${salt}`;

  const bytes = Buffer.from(input, "utf-8");

  const hash = x86.hash32(bytes);

  // Convert to 0-99 range for percentage-based bucketing
  return Math.abs(hash) % 100;
}

export function isUserInRollout(
  userId: number,
  featureSlug: string,
  rolloutPercentage: number,
  salt: string = ""
): boolean {
  // Validate rollout percentage
  if (rolloutPercentage < 0 || rolloutPercentage > 100) {
    throw new Error("Rollout percentage must be between 0 and 100");
  }

  // 0% rollout = nobody gets it
  if (rolloutPercentage === 0) return false;

  // 100% rollout = everyone gets it
  if (rolloutPercentage === 100) return true;

  // Get user's bucket and check if it falls within the rollout percentage
  const bucket = getUserBucket(userId, featureSlug, salt);
  return bucket < rolloutPercentage;
}

export function getUserRolloutTier(userId: number, featureSlug: string, salt: string = ""): number {
  return getUserBucket(userId, featureSlug, salt);
}

export function getTeamBucket(teamId: number, featureSlug: string, salt: string = ""): number {
  // Combine teamId, feature, and salt into a single string
  // Use "team:" prefix to ensure different distribution from users
  const input = `team:${teamId}:${featureSlug}:${salt}`;

  // Convert string to bytes (murmurhash3js-revisited requires byte input)
  const bytes = Buffer.from(input, "utf-8");

  // Use MurmurHash3 x86 32-bit variant for fast, uniform distribution
  const hash = x86.hash32(bytes);

  // Convert to 0-99 range for percentage-based bucketing
  return Math.abs(hash) % 100;
}

export function isTeamInRollout(
  teamId: number,
  featureSlug: string,
  rolloutPercentage: number,
  salt: string = ""
): boolean {
  // Validate rollout percentage
  if (rolloutPercentage < 0 || rolloutPercentage > 100) {
    throw new Error("Rollout percentage must be between 0 and 100");
  }

  // 0% rollout = no teams get it
  if (rolloutPercentage === 0) return false;

  // 100% rollout = all teams get it
  if (rolloutPercentage === 100) return true;

  // Get team's bucket and check if it falls within the rollout percentage
  const bucket = getTeamBucket(teamId, featureSlug, salt);
  return bucket < rolloutPercentage;
}

export function getTeamRolloutTier(teamId: number, featureSlug: string, salt: string = ""): number {
  return getTeamBucket(teamId, featureSlug, salt);
}
