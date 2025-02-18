import type { Prisma } from "@prisma/client";

import { appDataSchemas } from "@calcom/app-store/apps.schemas.generated";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";

import buildCalendarEvent from "./lib/buildCalendarEvent";
import { createCRMEventSchema } from "./schema";

const log = logger.getSubLogger({ prefix: [`[[tasker] createCRMEvent`] });

export async function createCRMEvent(payload: string): Promise<void> {
  try {
    const parsedPayload = createCRMEventSchema.safeParse(JSON.parse(payload));

    if (!parsedPayload.success) {
      throw new Error(`malformed payload in createCRMEvent: ${parsedPayload.error}`);
    }
    const { bookingUid } = parsedPayload.data;

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

    if (booking.status !== BookingStatus.ACCEPTED) {
      log.info(`Booking status is not ACCEPTED`);
      return;
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
      try {
        const appData = eventTypeAppMetadata[appSlug as keyof typeof eventTypeAppMetadata];
        const appDataSchema = appDataSchemas[appSlug as keyof typeof appDataSchemas];

        if (!appData || !appDataSchema) {
          throw new Error(`Could not find appData or appDataSchema for ${appSlug}`);
        }

        const appParse = appDataSchema.safeParse(appData);

        if (!appParse.success) {
          log.error(`Error parsing event type app data for bookingUid ${bookingUid}`, appParse?.error);
          continue;
        }

        const app = appParse.data;

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
      } catch (error) {
        log.error(`Error processing CRM app ${appSlug} for booking ${bookingUid}:`, error);
        // Continue with next app even if one fails
        continue;
      }
    }

    await prisma.bookingReference.createMany({
      data: bookingReferencesToCreate,
    });
  } catch (error) {
    log.error(`Error in createCRMEvent for payload: ${payload}:`, error);
    throw error;
  }
}
