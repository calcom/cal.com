import { waitUntil } from "@vercel/functions";

import { UsageEvent, LicenseKeySingleton } from "@calcom/ee/common/server/LicenseKeyService";
import { DeploymentRepository } from "@calcom/lib/server/repository/deployment";
import { Prisma } from "@calcom/prisma/client";
import type { PrismaClient } from "@calcom/prisma/client";

async function incrementUsage(prismaClient: PrismaClient, event?: UsageEvent) {
  const deploymentRepo = new DeploymentRepository(prismaClient);
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
