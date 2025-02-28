import type { Prisma } from "@prisma/client";

import { appDataSchemas } from "@calcom/app-store/apps.schemas.generated";
import { RetryableError } from "@calcom/core/crmManager/errors";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
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
      // TODO: I think we should not retry on malformed payload
      throw new RetryableError(`malformed payload in createCRMEvent: ${parsedPayload.error}`);
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
      // TODO: I think we should not retry on booking not found
      throw new RetryableError(`booking not found for uid: ${bookingUid}`);
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
    const existingBookingReferences = await prisma.bookingReference.findMany({
      where: {
        bookingId: booking.id,
      },
    });

    const errorPerApp: Record<string, Error[]> = {};
    // Find enabled CRM apps for the event type
    for (const appSlug of Object.keys(eventTypeAppMetadata)) {
      // Try Catch per app to ensure all apps are tried even if any of them throws an error
      try {
        console.log("appSlug", appSlug);
        const appData = eventTypeAppMetadata[appSlug as keyof typeof eventTypeAppMetadata];
        const appDataSchema = appDataSchemas[appSlug as keyof typeof appDataSchemas];
        if (!appData || !appDataSchema) {
          throw new Error(`Could not find appData or appDataSchema for ${appSlug}`);
        }

        const appParse = appDataSchema.safeParse(appData);

        if (!appParse.success) {
          // TODO: Should we push it to errorsPerApp?
          log.error(`Error parsing event type app data for bookingUid ${bookingUid}`, appParse?.error);
          continue;
        }

        const app = appParse.data;
        const hasCrmCategory =
          app.appCategories && app.appCategories.some((category: string) => category === "crm");

        if (!app.enabled || !app.credentialId || !hasCrmCategory) {
          log.info(`Skipping CRM app ${appSlug}`, {
            enabled: app.enabled,
            credentialId: app.credentialId,
            hasCrmCategory,
          });
          continue;
        }

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

        const existingBookingReferenceForTheCredential = existingBookingReferences.find(
          (reference) => reference.credentialId === crmCredential.id
        );

        if (existingBookingReferenceForTheCredential) {
          log.info(`Skipping CRM app ${appSlug} as booking reference already exists`, {
            credentialId: crmCredential.id,
            bookingReferenceId: existingBookingReferenceForTheCredential.id,
          });
          continue;
        }

        const CrmManager = (await import("@calcom/core/crmManager/crmManager")).default;

        const crm = new CrmManager(crmCredential, app);

        const results = await crm.createEvent(calendarEvent);

        if (results) {
          console.log("Pushing results");
          bookingReferencesToCreate.push({
            type: crmCredential.type,
            credentialId: crmCredential.id,
            uid: results.id,
            meetingId: results.id,
            bookingId: booking.id,
          });
        }
      } catch (error) {
        errorPerApp[appSlug] = error;
      }
    }

    await prisma.bookingReference.createMany({
      data: bookingReferencesToCreate,
    });

    // throw error if there are any errors, tag the error with the app slug
    const errorMsgs = Object.entries(errorPerApp).map(([appSlug, error]) => {
      return `(app: ${appSlug}) ${error.message}`;
    });

    if (errorMsgs.length > 0) {
      const hasAnyRetryableErrors = Object.values(errorPerApp)
        .flat()
        .some((error) => error instanceof RetryableError);
      if (hasAnyRetryableErrors) {
        throw new RetryableError(errorMsgs.join("\n"));
      } else {
        throw new Error(errorMsgs.join("\n"));
      }
    }
  } catch (error) {
    const errorMsg = `Error creating crm event: error: ${safeStringify(error)} Data: ${safeStringify({
      payload,
    })}`;
    if (error instanceof RetryableError) {
      log.error(`[Will retry] ${errorMsg}`);
      // Intentional rethrow to trigger retry
      throw error;
    } else {
      log.error(`[Will not retry] ${errorMsg}`);
    }
  }
}
