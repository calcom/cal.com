import { waitUntil } from "@vercel/functions";

import { UsageEvent, LicenseKeySingleton } from "@calcom/ee/common/server/LicenseKeyService";
import type { IDeploymentRepository } from "@calcom/features/ee/deployment/repositories/IDeploymentRepository";
import { Prisma } from "@calcom/prisma/client";
import type { PrismaClient } from "@calcom/prisma/client";

class InlineDeploymentRepository implements IDeploymentRepository {
  constructor(private prisma: PrismaClient) {}

  async getLicenseKeyWithId(id: number): Promise<string | null> {
    const deployment = await this.prisma.deployment.findUnique({
      where: { id },
      select: { licenseKey: true },
    });
    return deployment?.licenseKey || null;
  }

  async getSignatureToken(id: number): Promise<string | null> {
    const deployment = await this.prisma.deployment.findUnique({
      where: { id },
      select: { signatureTokenEncrypted: true },
    });
    return deployment?.signatureTokenEncrypted || null;
  }
}

async function incrementUsage(prismaClient: PrismaClient, event?: UsageEvent) {
  const deploymentRepo = new InlineDeploymentRepository(prismaClient);
  try {
    const licenseKeyService = await LicenseKeySingleton.getInstance(deploymentRepo);
    await licenseKeyService.incrementUsage(event);
  } catch (e) {
    console.log(e);
  }
}

export function usageTrackingExtention(prismaClient: PrismaClient) {
  return Prisma.defineExtension({
    query: {
      booking: {
        async create({ args, query }) {
          waitUntil(incrementUsage(prismaClient, UsageEvent.BOOKING));
          return query(args);
        },
      },
      user: {
        async create({ args, query }) {
          waitUntil(incrementUsage(prismaClient, UsageEvent.USER));
          return query(args);
        },
      },
    },
  });
}
