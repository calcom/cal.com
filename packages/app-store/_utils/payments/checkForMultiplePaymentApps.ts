import type z from "zod";

import type { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";

import type { appDataSchemas } from "../../apps.schemas.generated";

/**
 *
 * @param metadata The event type metadata
 * @param inclusive Determines if multiple includes the case of 1
 * @returns boolean
 */
const checkForMultiplePaymentApps = (
  metadata: z.infer<typeof EventTypeMetaDataSchema>,
  inclusive = false
) => {
  let enabledPaymentApps = 0;
  for (const appKey in metadata?.apps) {
    const app = metadata?.apps[appKey as keyof typeof appDataSchemas];

    if ("appCategories" in app) {
      const isPaymentApp = app.appCategories.includes("payment");
      if (isPaymentApp && app.enabled) {
        enabledPaymentApps++;
      }
    } else if ("price" in app && app.enabled) {
      enabledPaymentApps++;
    }

    if (inclusive && enabledPaymentApps >= 1) {
      return true;
    } else if (!inclusive && enabledPaymentApps > 1) {
      return true;
    }
  }

  return false;
};

export default checkForMultiplePaymentApps;
