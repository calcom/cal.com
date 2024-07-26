import { Prisma } from "@prisma/client";

import LicenseKeyService, { UsageEvent } from "@calcom/ee/common/server/LicenseKeyService";

export function usageTrackingExtention() {
  return Prisma.defineExtension({
    query: {
      booking: {
        async create({ args, query }) {
          try {
            const licenseKeyService = await LicenseKeyService.create();
            await licenseKeyService.incrementUsage();
          } catch (e) {
            console.log(e);
          }
          return query(args);
        },
      },
      user: {
        async create({ args, query }) {
          try {
            const licenseKeyService = await LicenseKeyService.create();
            await licenseKeyService.incrementUsage(UsageEvent.USER);
          } catch (e) {
            console.log(e);
          }
          return query(args);
        },
      },
    },
  });
}
