import type { eventTypeAppMetadataOptionalSchema } from "@calcom/app-store/zod-utils";
import type { Actor } from "@calcom/features/booking-audit/lib/dto/types";
import { getAppNameFromSlug } from "@calcom/features/booking-audit/lib/getAppNameFromSlug";
import { makeAppActor, makeAppActorUsingSlug } from "@calcom/features/booking-audit/lib/makeActor";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { z } from "zod";

const log = logger.getSubLogger({ prefix: ["[getAppActor]"] });

/**
 * Gets an actor object for an app, using the credentialId if available,
 * otherwise falling back to the appSlug.
 *
 * @param params - The parameters for creating the actor
 * @param params.appSlug - The slug of the app (e.g., "stripe", "paypal", "zoom")
 * @param params.bookingId - The booking ID for logging purposes
 * @param params.apps - The event type app metadata containing credentialIds
 * @returns An Actor object representing the app
 */
export function getAppActor({
  appSlug,
  bookingId,
  apps,
}: {
  appSlug: string;
  bookingId: number;
  apps: z.infer<typeof eventTypeAppMetadataOptionalSchema>;
}): Actor {
  let actor: Actor;
  const appData = apps?.[appSlug as keyof typeof apps];
  if (appData?.credentialId) {
    actor = makeAppActor({ credentialId: appData.credentialId });
  } else {
    log.warn(
      `Missing credentialId for app, using appSlug fallback`,
      safeStringify({
        bookingId,
        appSlug,
      })
    );
    actor = makeAppActorUsingSlug({
      appSlug,
      name: getAppNameFromSlug({ appSlug }),
    });
  }
  return actor;
}
