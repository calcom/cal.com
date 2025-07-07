import { Prisma } from "@prisma/client";
import type { PrismaClient as PrismaClientWithoutExtensions } from "@prisma/client";
import { waitUntil } from "@vercel/functions";

import { UsageEvent, LicenseKeySingleton } from "@calcom/ee/common/server/LicenseKeyService";
import { PrismaDeploymentRepository } from "@calcom/lib/server/repository/prismaDeployment";

async function incrementUsage(prismaClient: PrismaClientWithoutExtensions, event?: UsageEvent) {
  const deploymentRepo = new PrismaDeploymentRepository(prismaClient);
  try {
    const licenseKeyService = await LicenseKeySingleton.getInstance(deploymentRepo);
    await licenseKeyService.incrementUsage(event);
  } catch (e) {
    console.log(e);
  }
}

export function usageTrackingExtention(prismaClient: PrismaClientWithoutExtensions) {
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
