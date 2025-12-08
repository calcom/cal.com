import { captureException } from "@sentry/nextjs";

import type { PrismaClient } from "@calcom/prisma";
import { PolicyType } from "@calcom/prisma/enums";

interface LatestPolicyCache {
  data: {
    version: Date;
    type: PolicyType;
    description: string;
    descriptionNonUS: string;
    publishedAt: Date;
  } | null;
  expiry: number;
}

interface PolicyWithoutCount {
  version: Date;
  type: PolicyType;
  description: string;
  descriptionNonUS: string;
  publishedAt: Date;
}

/**
 * Repository class for managing policy versions and user acceptances.
 * Implements caching for frequently accessed data like latest policy version.
 */
export class PolicyRepository {
  // Cache latest policy version to avoid DB hits on every /me query
  private static latestPolicyCache: Map<PolicyType, LatestPolicyCache> = new Map();

  constructor(private prismaClient: PrismaClient) { }

  private clearCache(type?: PolicyType) {
    if (type) {
      PolicyRepository.latestPolicyCache.delete(type);
    } else {
      PolicyRepository.latestPolicyCache.clear();
    }
  }

  /**
   * Gets the latest policy version for a given type.
   * Uses caching with 5-minute TTL to reduce database load.
   * @param type - The policy type to get
   * @returns Promise with policy data or null if not found
   */
  async getLatestPolicy(type: PolicyType) {
    try {
      // Check cache first
      const cached = PolicyRepository.latestPolicyCache.get(type);
      if (cached && Date.now() < cached.expiry) {
        return cached.data;
      }

      // Fetch from DB
      const policy = await this.prismaClient.policyVersion.findFirst({
        where: { type },
        orderBy: { version: "desc" },
        select: {
          version: true,
          type: true,
          description: true,
          descriptionNonUS: true,
          publishedAt: true,
        },
      });

      // Update cache
      if (policy) {
        PolicyRepository.latestPolicyCache.set(type, {
          data: policy,
          expiry: Date.now() + 5 * 60 * 1000, // 5 minutes cache
        });
      }

      return policy;
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  /**
   * Checks if a user has accepted a specific policy version.
   * @param userId - The user ID
   * @param policyVersion - The policy version date
   * @param policyType - The policy type
   * @returns Promise with boolean indicating acceptance status
   */
  async hasUserAcceptedPolicy(userId: number, policyVersion: Date, policyType: PolicyType) {
    try {
      const acceptance = await this.prismaClient.userPolicyAcceptance.findUnique({
        where: {
          userId_policyVersion_policyType: {
            userId,
            policyVersion,
            policyType,
          },
        },
      });

      return !!acceptance;
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  /**
   * Records a user's acceptance of a policy version.
   * @param userId - The user ID
   * @param policyVersion - The policy version date
   * @param policyType - The policy type
   * @returns Promise with the created acceptance record
   */
  async recordAcceptance(userId: number, policyVersion: Date, policyType: PolicyType) {
    try {
      return await this.prismaClient.userPolicyAcceptance.create({
        data: {
          userId,
          policyVersion,
          policyType,
          acceptedAt: new Date(),
        },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  /**
   * Creates a new policy version.
   * @param data - Policy version data
   * @param createdById - ID of the user creating the policy
   * @returns Promise with the created policy version
   */
  async createPolicyVersion(
    data: {
      type: PolicyType;
      version: Date;
      description: string;
      descriptionNonUS: string;
    },
    createdById: number
  ) {
    try {
      const policy = await this.prismaClient.policyVersion.create({
        data: {
          type: data.type,
          version: data.version,
          description: data.description,
          descriptionNonUS: data.descriptionNonUS,
          publishedAt: new Date(),
          createdById,
        },
      });

      // Clear cache since we created a new version
      this.clearCache(data.type);

      return policy;
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  /**
   * Lists policy versions with pagination.
   * @param type - The policy type to filter by
   * @param cursor - Cursor for pagination (version date)
   * @param limit - Number of records to return
   * @returns Promise with policies and next cursor
   */
  async listPolicyVersions(type: PolicyType, cursor: Date | undefined, limit: number) {
    try {
      const where: { type: PolicyType; version?: { lt: Date } } = { type };

      // If cursor provided, only get policies before that date
      if (cursor) {
        where.version = { lt: cursor };
      }

      const policies = await this.prismaClient.policyVersion.findMany({
        where,
        orderBy: { version: "desc" },
        take: limit + 1, // Take one more to determine if there are more results
        select: {
          version: true,
          type: true,
          description: true,
          descriptionNonUS: true,
          publishedAt: true,
        },
      });

      let nextCursor: Date | undefined = undefined;
      if (policies.length > limit) {
        const nextItem = policies.pop(); // Remove the extra item
        nextCursor = nextItem?.version;
      }

      const policiesData: PolicyWithoutCount[] = policies.map((p) => ({
        version: p.version,
        type: p.type,
        description: p.description,
        descriptionNonUS: p.descriptionNonUS,
        publishedAt: p.publishedAt,
      }));

      return {
        policies: policiesData,
        nextCursor,
      };
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

}
