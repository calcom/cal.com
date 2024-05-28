import { Prisma } from "@prisma/client";

import LicenseKeyService from "@calcom/ee/common/server/LicenseKeyService";
import { BookingStatus } from "@calcom/prisma/enums";

export function usageTrackingExtention() {
  return Prisma.defineExtension({
    query: {
      booking: {
        async create({ args, query }) {
          const licenseKeyService = await LicenseKeyService.create();
          await licenseKeyService.incrementUsage();
          return query(args);
        },
        async update({ args, query }) {
          if (args.data.status === BookingStatus.CANCELLED || args.data.status === BookingStatus.REJECTED) {
            // TODO:
            // await licenseKeyService.decrementUsage();
          }
          return query(args);
        },
      },
    },
  });
}
