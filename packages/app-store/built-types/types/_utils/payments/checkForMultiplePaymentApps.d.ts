import type z from "zod";
import type { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";
/**
 *
 * @param metadata The event type metadata
 * @param inclusive Determines if multiple includes the case of 1
 * @returns boolean
 */
declare const checkForMultiplePaymentApps: (metadata: z.infer<typeof EventTypeMetaDataSchema>, inclusive?: boolean) => boolean;
export default checkForMultiplePaymentApps;
//# sourceMappingURL=checkForMultiplePaymentApps.d.ts.map