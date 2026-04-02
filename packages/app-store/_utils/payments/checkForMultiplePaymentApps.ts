import type { eventTypeAppMetadataOptionalSchema } from "@calcom/app-store/zod-utils";
import type z from "zod";
import type { appDataSchemas } from "../../apps.schemas.generated";

/**
 *
 * @param metadata The event type metadata
 * @param inclusive Determines if multiple includes the case of 1
 * @returns boolean
 */
const checkForMultiplePaymentApps = (
  metadata:
    | {
        apps?: z.infer<typeof eventTypeAppMetadataOptionalSchema>;
      }
    | null
    | undefined,
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
  }

  return inclusive ? enabledPaymentApps >= 1 : enabledPaymentApps > 1;
};

export default checkForMultiplePaymentApps;
