import type { z } from "zod";

import type { eventTypeAppCardZod } from "@calcom/app-store/eventTypeAppCardZod";
import { eventTypeAppMetadataOptionalSchema } from "@calcom/app-store/zod-utils";
import CrmManager from "@calcom/features/crmManager/crmManager";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";

import type { NoShowAttendees } from "../handleMarkNoShow";
import { noShowEnabledApps } from "./noShowEnabledApps";

const log = logger.getSubLogger({ prefix: ["handleSendingNoShowDataToApps"] });

export default async function handleSendingAttendeeNoShowDataToApps(
  bookingUid: string,
  attendees: NoShowAttendees
) {
  // Get event type metadata
  const eventTypeQuery = await prisma.booking.findUnique({
    where: {
      uid: bookingUid,
    },
    select: {
      eventType: {
        select: {
          metadata: true,
        },
      },
    },
  });
  if (!eventTypeQuery || !eventTypeQuery?.eventType?.metadata) {
    log.warn(`For no show, could not find eventType for bookingUid ${bookingUid}`);
    return;
  }

  const eventTypeMetadataParse = EventTypeMetaDataSchema.safeParse(eventTypeQuery?.eventType?.metadata);
  if (!eventTypeMetadataParse.success) {
    log.error(`Malformed event type metadata for bookingUid ${bookingUid}`);
    return;
  }
  const eventTypeAppMetadata = eventTypeAppMetadataOptionalSchema.parse(eventTypeMetadataParse.data?.apps);

  for (const slug in eventTypeAppMetadata) {
    if (noShowEnabledApps.includes(slug)) {
      const app = eventTypeAppMetadata[slug as keyof typeof eventTypeAppMetadata];

      const appCategory = app.appCategories[0];

      if (appCategory === "crm") {
        await handleCRMNoShow(bookingUid, app, attendees);
      }
    }
  }

  return;
}

async function handleCRMNoShow(
  bookingUid: string,
  appData: z.infer<typeof eventTypeAppCardZod>,
  attendees: NoShowAttendees
) {
  // Handle checking if no she in CrmService

  const credential = await prisma.credential.findUnique({
    where: {
      id: appData.credentialId,
    },
    include: {
      user: {
        select: {
          email: true,
        },
      },
    },
  });

  if (!credential) {
    log.warn(`CRM credential not found for bookingUid ${bookingUid}`);
    return;
  }

  const crm = new CrmManager(credential, appData);
  await crm.handleAttendeeNoShow(bookingUid, attendees);
}
