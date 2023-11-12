import type { appDataSchemas } from "apps.schemas.generated";
import type z from "zod";

import type { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";

const checkForMultiplePaymentApps = (metadata: z.infer<typeof EventTypeMetaDataSchema>) => {
  let enabledPaymentApps = 0;
  for (const appKey in metadata?.apps) {
    const app = metadata?.apps[appKey as keyof typeof appDataSchemas];
    if (app.price && app.enabled) {
      enabledPaymentApps++;
    }

    if (enabledPaymentApps > 1) {
      return true;
    }
  }

  return false;
};

export default checkForMultiplePaymentApps;
