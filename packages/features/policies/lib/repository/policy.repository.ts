import { captureException } from "@sentry/nextjs";

import type { PrismaClient } from "@calcom/prisma";
import { PolicyType } from "@calcom/prisma/enums";

interface LatestPolicyCache {
  data: PolicyItem | null;
  expiry: number;
}

export interface PolicyItem {
  version: Date;
  type: PolicyType;
  description: string;
  descriptionNonUS: string;
}

export interface PolicyAdminItem extends PolicyItem {
  publishedAt: Date;
  createdById: number;
}

export class PolicyRepository {
  private static latestPolicyCache: Map<PolicyType, LatestPolicyCache> = new Map();

  constructor(private prismaClient: PrismaClient) { }

  private clearCache(type?: PolicyType) {
    if (type) {
      PolicyRepository.latestPolicyCache.delete(type);
    } else {
      PolicyRepository.latestPolicyCache.clear();
    }
  }

  async getLatestPolicy(type: PolicyType): Promise<PolicyItem | null> {
    try {
      // Disable cache in E2E tests to avoid stale data
      const isCacheEnabled = process.env.NEXT_PUBLIC_IS_E2E !== "1";

      if (isCacheEnabled) {
        console.log("fetching cached data for policy type: ", type);
        const cached = PolicyRepository.latestPolicyCache.get(type);
        if (cached && Date.now() < cached.expiry) {
          return cached.data;
        }
      }

      const policy = await this.prismaClient.policyVersion.findFirst({
        where: { type },
        orderBy: { version: "desc" },
        select: {
          version: true,
          type: true,
          description: true,
          descriptionNonUS: true,
        },
      });

      if (policy && isCacheEnabled) {
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

  async recordAcceptance(userId: number, policyVersion: Date, policyType: PolicyType) {
    try {
      const result = await this.prismaClient.userPolicyAcceptance.create({
        data: {
          userId,
          policyVersion,
          policyType,
          acceptedAt: new Date(),
        },
      });

      return result;
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

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

      this.clearCache(data.type);

      return policy;
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async listPolicyVersions(cursor: Date | undefined, limit: number, type?: PolicyType) {
    try {
      const where: { type?: PolicyType; version?: { lt: Date } } = { type };

      if (cursor) {
        where.version = { lt: cursor };
      }

      const policies = await this.prismaClient.policyVersion.findMany({
        where,
        orderBy: { version: "desc" },
        take: limit + 1,
        select: {
          version: true,
          type: true,
          description: true,
          descriptionNonUS: true,
          publishedAt: true,
          createdById: true,
        },
      });

      let nextCursor: Date | undefined = undefined;
      if (policies.length > limit) {
        const nextItem = policies.pop();
        nextCursor = nextItem?.version;
      }

      const policiesData: PolicyAdminItem[] = policies.map((p) => ({
        version: p.version,
        type: p.type,
        description: p.description,
        descriptionNonUS: p.descriptionNonUS,
        publishedAt: p.publishedAt,
        createdById: p.createdById,
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
