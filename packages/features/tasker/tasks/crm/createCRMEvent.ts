import type { Prisma } from "@prisma/client";

import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";

import buildCalendarEvent from "./lib/buildCalendarEvent";
import { createCRMEventSchema } from "./schema";

const log = logger.getSubLogger({ prefix: [`[[tasker] createCRMEvent`] });

export async function createCRMEvent(payload: string): Promise<void> {
  const parsedPayload = createCRMEventSchema.safeParse(JSON.parse(payload));

  if (!parsedPayload.success) {
    throw new Error(`malformed payload: ${parsedPayload.error}`);
  }

  const { bookingUid } = parsedPayload.data;
  // TODO remove credentialId from payload

  const booking = await prisma.booking.findUnique({
    where: {
      uid: bookingUid,
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          locale: true,
          username: true,
          timeZone: true,
        },
      },
      eventType: {
        select: {
          metadata: true,
        },
      },
      references: {
        select: {
          type: true,
        },
      },
    },
  });

  if (!booking) {
    throw new Error(`booking not found for uid: ${bookingUid}`);
  }

  if (!booking.user) {
    throw new Error(`user not found for uid: ${bookingUid}`);
  }

  const eventTypeMetadata = EventTypeMetaDataSchema.safeParse(booking.eventType?.metadata);

  if (!eventTypeMetadata.success) {
    throw new Error(`malformed event type metadata: ${eventTypeMetadata.error}`);
  }

  const eventTypeAppMetadata = eventTypeMetadata.data?.apps;

  if (!eventTypeAppMetadata) {
    throw new Error(`event type app metadata not found for booking ${bookingUid}`);
  }

  const calendarEvent = await buildCalendarEvent(bookingUid);

  const bookingReferencesToCreate: Prisma.BookingReferenceUncheckedCreateInput[] = [];

  // Find enabled CRM apps for the event type
  for (const appSlug of Object.keys(eventTypeAppMetadata)) {
    const app = eventTypeAppMetadata[appSlug as keyof typeof eventTypeAppMetadata];

    if (
      !app.appCategories ||
      !app.appCategories.some((category: string) => category === "crm") ||
      !app.enabled ||
      !app.credentialId
    )
      continue;

    const crmCredential = await prisma.credential.findUnique({
      where: {
        id: app.credentialId,
      },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    if (!crmCredential) {
      throw new Error(`Credential not found for credentialId: ${app.credentialId}`);
    }

    const CrmManager = (await import("@calcom/core/crmManager/crmManager")).default;

    const crm = new CrmManager(crmCredential, app);

    const results = await crm.createEvent(calendarEvent).catch((error) => {
      log.error(`Error creating crm event for credentialId ${app.credentialId}`, error);
    });

    if (results) {
      bookingReferencesToCreate.push({
        type: crmCredential.type,
        uid: results.id,
        meetingId: results.id,
        credentialId: crmCredential.id,
        bookingId: booking.id,
      });
    }
  }

  await prisma.bookingReference.createMany({
    data: bookingReferencesToCreate,
  });

  return;
}
