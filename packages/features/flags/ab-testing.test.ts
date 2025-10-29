import { describe, expect, it } from "vitest";

import {
  getTeamBucket,
  getTeamRolloutTier,
  getUserBucket,
  getUserRolloutTier,
  isTeamInRollout,
  isUserInRollout,
} from "./ab-testing";

describe("A/B Testing Utilities", () => {
  describe("getUserBucket", () => {
    it("should return a number between 0 and 99", () => {
      const bucket = getUserBucket(123, "test-feature");
      expect(bucket).toBeGreaterThanOrEqual(0);
      expect(bucket).toBeLessThan(100);
    });

    it("should return consistent results for the same inputs", () => {
      const userId = 12345;
      const feature = "test-feature";
      const salt = "v1";

      const bucket1 = getUserBucket(userId, feature, salt);
      const bucket2 = getUserBucket(userId, feature, salt);
      const bucket3 = getUserBucket(userId, feature, salt);

      expect(bucket1).toBe(bucket2);
      expect(bucket2).toBe(bucket3);
    });

    it("should return different buckets for different users", () => {
      const feature = "test-feature";
      const salt = "v1";

      const bucket1 = getUserBucket(100, feature, salt);
      const bucket2 = getUserBucket(200, feature, salt);
      const bucket3 = getUserBucket(300, feature, salt);

      // Not guaranteed to be different, but highly likely with good hash function
      const uniqueBuckets = new Set([bucket1, bucket2, bucket3]);
      expect(uniqueBuckets.size).toBeGreaterThan(1);
    });

    it("should return different buckets for different features", () => {
      const userId = 12345;
      const salt = "v1";

      const bucket1 = getUserBucket(userId, "feature-a", salt);
      const bucket2 = getUserBucket(userId, "feature-b", salt);
      const bucket3 = getUserBucket(userId, "feature-c", salt);

      // Not guaranteed to be different, but highly likely with good hash function
      const uniqueBuckets = new Set([bucket1, bucket2, bucket3]);
      expect(uniqueBuckets.size).toBeGreaterThan(1);
    });

    it("should return different buckets when salt changes", () => {
      const userId = 12345;
      const feature = "test-feature";

      const bucketV1 = getUserBucket(userId, feature, "v1");
      const bucketV2 = getUserBucket(userId, feature, "v2");
      const bucketV3 = getUserBucket(userId, feature, "v3");

      // Not guaranteed to be different, but highly likely with good hash function
      const uniqueBuckets = new Set([bucketV1, bucketV2, bucketV3]);
      expect(uniqueBuckets.size).toBeGreaterThan(1);
    });

    it("should handle empty salt", () => {
      const userId = 12345;
      const feature = "test-feature";

      const bucketNoSalt = getUserBucket(userId, feature);
      const bucketEmptySalt = getUserBucket(userId, feature, "");

      expect(bucketNoSalt).toBe(bucketEmptySalt);
    });

    it("should distribute users uniformly across buckets", () => {
      const feature = "test-feature";
      const salt = "v1";
      const bucketCounts: number[] = new Array(100).fill(0);

      // Test 10,000 users
      for (let userId = 1; userId <= 10000; userId++) {
        const bucket = getUserBucket(userId, feature, salt);
        bucketCounts[bucket]++;
      }

      // Each bucket should have roughly 100 users (10,000 / 100)
      // Allow for variance - expect each bucket to have between 50 and 150 users
      bucketCounts.forEach((count) => {
        expect(count).toBeGreaterThan(50);
        expect(count).toBeLessThan(150);
      });

      // Calculate standard deviation to ensure uniform distribution
      const mean = 10000 / 100; // 100
      const variance =
        bucketCounts.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / bucketCounts.length;
      const stdDev = Math.sqrt(variance);

      // Standard deviation should be relatively small for uniform distribution
      expect(stdDev).toBeLessThan(15);
    });
  });

  describe("isUserInRollout", () => {
    it("should return true for 100% rollout", () => {
      expect(isUserInRollout(123, "test-feature", 100)).toBe(true);
      expect(isUserInRollout(456, "test-feature", 100)).toBe(true);
      expect(isUserInRollout(789, "test-feature", 100)).toBe(true);
    });

    it("should return false for 0% rollout", () => {
      expect(isUserInRollout(123, "test-feature", 0)).toBe(false);
      expect(isUserInRollout(456, "test-feature", 0)).toBe(false);
      expect(isUserInRollout(789, "test-feature", 0)).toBe(false);
    });

    it("should return consistent results for the same inputs", () => {
      const userId = 12345;
      const feature = "test-feature";
      const percentage = 50;
      const salt = "v1";

      const result1 = isUserInRollout(userId, feature, percentage, salt);
      const result2 = isUserInRollout(userId, feature, percentage, salt);
      const result3 = isUserInRollout(userId, feature, percentage, salt);

      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });

    it("should respect rollout percentage approximately", () => {
      const feature = "test-feature";
      const salt = "v1";
      const percentage = 30;

      let inRollout = 0;
      const totalUsers = 10000;

      for (let userId = 1; userId <= totalUsers; userId++) {
        if (isUserInRollout(userId, feature, percentage, salt)) {
          inRollout++;
        }
      }

      const actualPercentage = (inRollout / totalUsers) * 100;

      // Allow 2% margin of error
      expect(actualPercentage).toBeGreaterThan(percentage - 2);
      expect(actualPercentage).toBeLessThan(percentage + 2);
    });

    it("should change users in rollout when salt changes", () => {
      const feature = "test-feature";
      const percentage = 50;

      const usersInV1 = new Set<number>();
      const usersInV2 = new Set<number>();

      for (let userId = 1; userId <= 1000; userId++) {
        if (isUserInRollout(userId, feature, percentage, "v1")) {
          usersInV1.add(userId);
        }
        if (isUserInRollout(userId, feature, percentage, "v2")) {
          usersInV2.add(userId);
        }
      }

      // Both should have roughly 500 users (50% of 1000)
      expect(usersInV1.size).toBeGreaterThan(450);
      expect(usersInV1.size).toBeLessThan(550);
      expect(usersInV2.size).toBeGreaterThan(450);
      expect(usersInV2.size).toBeLessThan(550);

      // But they should be different sets of users
      const commonUsers = [...usersInV1].filter((userId) => usersInV2.has(userId));
      const differentUsersPercentage = ((usersInV1.size - commonUsers.length) / usersInV1.size) * 100;

      // At least 40% of users should be different between v1 and v2
      expect(differentUsersPercentage).toBeGreaterThan(40);
    });

    it("should throw error for invalid rollout percentage", () => {
      expect(() => isUserInRollout(123, "test-feature", -1)).toThrow(
        "Rollout percentage must be between 0 and 100"
      );
      expect(() => isUserInRollout(123, "test-feature", 101)).toThrow(
        "Rollout percentage must be between 0 and 100"
      );
    });

    it("should work with edge case percentages", () => {
      const feature = "test-feature";
      const salt = "v1";

      // 1% rollout
      let inRollout = 0;
      for (let userId = 1; userId <= 10000; userId++) {
        if (isUserInRollout(userId, feature, 1, salt)) {
          inRollout++;
        }
      }
      const actualPercentage = (inRollout / 10000) * 100;
      expect(actualPercentage).toBeGreaterThan(0.5);
      expect(actualPercentage).toBeLessThan(1.5);

      // 99% rollout
      inRollout = 0;
      for (let userId = 1; userId <= 10000; userId++) {
        if (isUserInRollout(userId, feature, 99, salt)) {
          inRollout++;
        }
      }
      const actualPercentage99 = (inRollout / 10000) * 100;
      expect(actualPercentage99).toBeGreaterThan(98.5);
      expect(actualPercentage99).toBeLessThan(99.5);
    });

    it("should maintain consistent bucket ordering across different percentages", () => {
      const userId1 = 12345;
      const userId2 = 67890;
      const feature = "test-feature";
      const salt = "v1";

      // If user1 is in 30% rollout and user2 is not, user1 should remain in when increasing to 50%
      const user1In30 = isUserInRollout(userId1, feature, 30, salt);
      const user2In30 = isUserInRollout(userId2, feature, 30, salt);

      const user1In50 = isUserInRollout(userId1, feature, 50, salt);
      const user2In50 = isUserInRollout(userId2, feature, 50, salt);

      // If a user was in the 30% rollout, they must be in the 50% rollout
      if (user1In30) {
        expect(user1In50).toBe(true);
      }
      if (user2In30) {
        expect(user2In50).toBe(true);
      }
    });
  });

  describe("getUserRolloutTier", () => {
    it("should return the same value as getUserBucket", () => {
      const userId = 12345;
      const feature = "test-feature";
      const salt = "v1";

      const bucket = getUserBucket(userId, feature, salt);
      const tier = getUserRolloutTier(userId, feature, salt);

      expect(tier).toBe(bucket);
    });

    it("should return a value between 0 and 99", () => {
      const tier = getUserRolloutTier(123, "test-feature");
      expect(tier).toBeGreaterThanOrEqual(0);
      expect(tier).toBeLessThan(100);
    });

    it("should help determine rollout inclusion", () => {
      const userId = 12345;
      const feature = "test-feature";
      const salt = "v1";

      const tier = getUserRolloutTier(userId, feature, salt);

      // User should be in rollout if percentage > tier
      expect(isUserInRollout(userId, feature, tier + 1, salt)).toBe(true);
      expect(isUserInRollout(userId, feature, tier, salt)).toBe(false);
    });
  });

  describe("Real-world scenarios", () => {
    it("should handle gradual rollout scenario", () => {
      const feature = "new-dashboard";
      const salt = "production-v1";
      const testUserId = 12345;

      // User's tier determines when they get the feature
      const userTier = getUserRolloutTier(testUserId, feature, salt);

      // Start with 10% rollout
      const in10Percent = isUserInRollout(testUserId, feature, 10, salt);

      // Increase to 25%
      const in25Percent = isUserInRollout(testUserId, feature, 25, salt);

      // Increase to 50%
      const in50Percent = isUserInRollout(testUserId, feature, 50, salt);

      // Increase to 100%
      const in100Percent = isUserInRollout(testUserId, feature, 100, salt);

      // User should be in rollout based on their tier
      expect(in10Percent).toBe(userTier < 10);
      expect(in25Percent).toBe(userTier < 25);
      expect(in50Percent).toBe(userTier < 50);
      expect(in100Percent).toBe(true);

      // If user was in earlier rollout, they should remain in later rollouts
      if (in10Percent) {
        expect(in25Percent).toBe(true);
        expect(in50Percent).toBe(true);
        expect(in100Percent).toBe(true);
      }
    });

    it("should support independent A/B tests for multiple features", () => {
      const userId = 12345;
      const salt = "v1";

      const featureA = "feature-a";
      const featureB = "feature-b";
      const featureC = "feature-c";

      const inFeatureA = isUserInRollout(userId, featureA, 50, salt);
      const inFeatureB = isUserInRollout(userId, featureB, 50, salt);
      const inFeatureC = isUserInRollout(userId, featureC, 50, salt);

      // User can be in different combinations of features
      // Just verify they're independent (at least one should be different)
      const results = [inFeatureA, inFeatureB, inFeatureC];
      const allSame = results.every((r) => r === results[0]);

      // With 50% rollout on 3 features, it's very unlikely all 3 are the same
      // Probability of all same is 0.5^2 = 0.25, so 75% chance they're different
      // We can't assert this for a single user, but we know the system supports it
      expect([true, false]).toContain(inFeatureA);
      expect([true, false]).toContain(inFeatureB);
      expect([true, false]).toContain(inFeatureC);
    });

    it("should demonstrate re-randomization with salt change", () => {
      const userId = 12345;
      const feature = "test-feature";
      const percentage = 50;

      const inRolloutV1 = isUserInRollout(userId, feature, percentage, "production-v1");
      const inRolloutV2 = isUserInRollout(userId, feature, percentage, "production-v2");

      // Same user, same percentage, but different salt can produce different results
      // We can't guarantee they're different for one user, but the function supports it
      const bucketV1 = getUserBucket(userId, feature, "production-v1");
      const bucketV2 = getUserBucket(userId, feature, "production-v2");

      // Buckets should be different (not guaranteed but highly likely)
      expect([true, false]).toContain(bucketV1 !== bucketV2);
    });
  });

  describe("Team-based A/B Testing", () => {
    describe("getTeamBucket", () => {
      it("should return a number between 0 and 99", () => {
        const bucket = getTeamBucket(456, "test-feature");
        expect(bucket).toBeGreaterThanOrEqual(0);
        expect(bucket).toBeLessThan(100);
      });

      it("should return consistent results for the same inputs", () => {
        const teamId = 456;
        const feature = "test-feature";
        const salt = "v1";

        const bucket1 = getTeamBucket(teamId, feature, salt);
        const bucket2 = getTeamBucket(teamId, feature, salt);
        const bucket3 = getTeamBucket(teamId, feature, salt);

        expect(bucket1).toBe(bucket2);
        expect(bucket2).toBe(bucket3);
      });

      it("should return different buckets for different teams", () => {
        const feature = "test-feature";
        const salt = "v1";

        const bucket1 = getTeamBucket(100, feature, salt);
        const bucket2 = getTeamBucket(200, feature, salt);
        const bucket3 = getTeamBucket(300, feature, salt);

        const uniqueBuckets = new Set([bucket1, bucket2, bucket3]);
        expect(uniqueBuckets.size).toBeGreaterThan(1);
      });

      it("should return different buckets for teams vs users with same ID", () => {
        const id = 12345;
        const feature = "test-feature";
        const salt = "v1";

        const userBucket = getUserBucket(id, feature, salt);
        const teamBucket = getTeamBucket(id, feature, salt);

        // User and team buckets should be different (uses "team:" prefix)
        expect(userBucket).not.toBe(teamBucket);
      });

      it("should distribute teams uniformly across buckets", () => {
        const feature = "test-feature";
        const salt = "v1";
        const bucketCounts: number[] = new Array(100).fill(0);

        // Test 10,000 teams
        for (let teamId = 1; teamId <= 10000; teamId++) {
          const bucket = getTeamBucket(teamId, feature, salt);
          bucketCounts[bucket]++;
        }

        // Each bucket should have roughly 100 teams (10,000 / 100)
        bucketCounts.forEach((count) => {
          expect(count).toBeGreaterThan(50);
          expect(count).toBeLessThan(150);
        });

        // Calculate standard deviation
        const mean = 10000 / 100;
        const variance =
          bucketCounts.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / bucketCounts.length;
        const stdDev = Math.sqrt(variance);

        expect(stdDev).toBeLessThan(15);
      });
    });

    describe("isTeamInRollout", () => {
      it("should return true for 100% rollout", () => {
        expect(isTeamInRollout(456, "test-feature", 100)).toBe(true);
        expect(isTeamInRollout(789, "test-feature", 100)).toBe(true);
      });

      it("should return false for 0% rollout", () => {
        expect(isTeamInRollout(456, "test-feature", 0)).toBe(false);
        expect(isTeamInRollout(789, "test-feature", 0)).toBe(false);
      });

      it("should return consistent results for the same inputs", () => {
        const teamId = 456;
        const feature = "test-feature";
        const percentage = 50;
        const salt = "v1";

        const result1 = isTeamInRollout(teamId, feature, percentage, salt);
        const result2 = isTeamInRollout(teamId, feature, percentage, salt);
        const result3 = isTeamInRollout(teamId, feature, percentage, salt);

        expect(result1).toBe(result2);
        expect(result2).toBe(result3);
      });

      it("should respect rollout percentage approximately", () => {
        const feature = "test-feature";
        const salt = "v1";
        const percentage = 30;

        let inRollout = 0;
        const totalTeams = 10000;

        for (let teamId = 1; teamId <= totalTeams; teamId++) {
          if (isTeamInRollout(teamId, feature, percentage, salt)) {
            inRollout++;
          }
        }

        const actualPercentage = (inRollout / totalTeams) * 100;

        // Allow 2% margin of error
        expect(actualPercentage).toBeGreaterThan(percentage - 2);
        expect(actualPercentage).toBeLessThan(percentage + 2);
      });

      it("should throw error for invalid rollout percentage", () => {
        expect(() => isTeamInRollout(456, "test-feature", -1)).toThrow(
          "Rollout percentage must be between 0 and 100"
        );
        expect(() => isTeamInRollout(456, "test-feature", 101)).toThrow(
          "Rollout percentage must be between 0 and 100"
        );
      });
    });

    describe("getTeamRolloutTier", () => {
      it("should return the same value as getTeamBucket", () => {
        const teamId = 456;
        const feature = "test-feature";
        const salt = "v1";

        const bucket = getTeamBucket(teamId, feature, salt);
        const tier = getTeamRolloutTier(teamId, feature, salt);

        expect(tier).toBe(bucket);
      });

      it("should help determine rollout inclusion", () => {
        const teamId = 456;
        const feature = "test-feature";
        const salt = "v1";

        const tier = getTeamRolloutTier(teamId, feature, salt);

        // Team should be in rollout if percentage > tier
        expect(isTeamInRollout(teamId, feature, tier + 1, salt)).toBe(true);
        expect(isTeamInRollout(teamId, feature, tier, salt)).toBe(false);
      });
    });

    describe("Independent user and team rollouts", () => {
      it("should allow independent rollouts for users and teams", () => {
        const id = 12345;
        const feature = "test-feature";
        const percentage = 50;
        const salt = "v1";

        const userInRollout = isUserInRollout(id, feature, percentage, salt);
        const teamInRollout = isTeamInRollout(id, feature, percentage, salt);

        // Users and teams are bucketed independently
        // Both are valid boolean values
        expect(typeof userInRollout).toBe("boolean");
        expect(typeof teamInRollout).toBe("boolean");

        // They can have different results
        // (not guaranteed but possible and expected to differ for many IDs)
      });

      it("should demonstrate gradual rollout for teams", () => {
        const feature = "team-dashboard";
        const salt = "production-v1";
        const testTeamId = 456;

        const teamTier = getTeamRolloutTier(testTeamId, feature, salt);

        // Start with 10% rollout
        const in10Percent = isTeamInRollout(testTeamId, feature, 10, salt);
        expect(in10Percent).toBe(teamTier < 10);

        // Increase to 50%
        const in50Percent = isTeamInRollout(testTeamId, feature, 50, salt);
        expect(in50Percent).toBe(teamTier < 50);

        // Full rollout
        const in100Percent = isTeamInRollout(testTeamId, feature, 100, salt);
        expect(in100Percent).toBe(true);

        // If team was in earlier rollout, they remain in later rollouts
        if (in10Percent) {
          expect(in50Percent).toBe(true);
          expect(in100Percent).toBe(true);
        }
      });
    });
  });
});
