import { waitUntil } from "@vercel/functions";

import { UsageEvent, LicenseKeySingleton } from "@calcom/ee/common/server/LicenseKeyService";

import { Prisma } from "../client";

async function incrementUsage(event?: UsageEvent) {
  try {
    const licenseKeyService = await LicenseKeySingleton.getInstance();
    await licenseKeyService.incrementUsage(event);
  } catch (e) {
    console.log(e);
  }
}

export function usageTrackingExtention() {
  return Prisma.defineExtension({
    query: {
      booking: {
        async create({ args, query }) {
          waitUntil(incrementUsage(UsageEvent.BOOKING));
          return query(args);
        },
      },
      user: {
        async create({ args, query }) {
          waitUntil(incrementUsage(UsageEvent.USER));
          return query(args);
        },
      },
    },
  });
}
