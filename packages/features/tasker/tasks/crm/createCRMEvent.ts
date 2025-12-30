import { appDataSchemas } from "@calcom/app-store/apps.schemas.generated";
import { RetryableError } from "@calcom/lib/crmManager/errors";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import { BookingStatus } from "@calcom/prisma/enums";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";

import buildCalendarEvent from "./lib/buildCalendarEvent";
import { createCRMEventSchema } from "./schema";

const log = logger.getSubLogger({ prefix: [`[[tasker] createCRMEvent`] });
type AppSlug = string;
type UnknownError = unknown;

const handleErrors = ({
  errorPerApp,
  payload,
}: {
  errorPerApp: Record<AppSlug, UnknownError>;
  payload: string;
}) => {
  const errorMsgs = Object.entries(errorPerApp).map(([appSlug, error]) => {
    if (error instanceof Error) {
      return `(app: ${appSlug}) ${error.message}`;
    }
    return `(app: ${appSlug}) ${error}`;
  });

  if (errorMsgs.length > 0) {
    const hasAnyRetryableErrors = Object.values(errorPerApp).some((error) => error instanceof RetryableError);
    if (hasAnyRetryableErrors) {
      // Intentional rethrow to trigger retry
      throw new Error(errorMsgs.join("\n"));
    }
    log.error(`[Will not retry] Error creating CRM event for payload ${payload}: ${errorMsgs.join("\n")}`);
  }
};

export async function createCRMEvent(payload: string): Promise<void> {
  // All errors thrown from this try catch will be cause a retry
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
    const existingBookingReferences = await prisma.bookingReference.findMany({
      where: {
        bookingId: booking.id,
        deleted: null,
      },
    });

    const errorPerApp: Record<AppSlug, UnknownError> = {};

    // Parse apps and collect credential IDs for enabled CRM apps
    const appInfoMap = new Map<string, { app: any; credentialId: number }>();
    const credentialIds = new Set<number>();

    for (const appSlug of Object.keys(eventTypeAppMetadata)) {
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

      appInfoMap.set(appSlug, { app, credentialId: app.credentialId });
      credentialIds.add(app.credentialId);
    }

    const crmCredentials = await prisma.credential.findMany({
      where: {
        id: {
          in: Array.from(credentialIds),
        },
      },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    const crmCredentialMap = new Map<number, (typeof crmCredentials)[number]>();
    for (const credential of crmCredentials) {
      crmCredentialMap.set(credential.id, credential);
    }
    //Find enabled CRM apps for the event type
    for (const appSlug of Array.from(appInfoMap.keys())) {
      const { app, credentialId } = appInfoMap.get(appSlug)!;
      // Try Catch per app to ensure all apps are tried even if any of them throws an error
      // If we want to retry for an error from this try catch, then that error must be thrown as a RetryableError
      try {
        const crmCredential = crmCredentialMap.get(credentialId);

        if (!crmCredential) {
          throw new Error(`Credential not found for credentialId: ${credentialId}`);
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

        const CrmManager = (await import("@calcom/features/crmManager/crmManager")).default;

        const crm = new CrmManager(crmCredential, app);

        const results = await crm.createEvent(calendarEvent);

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
        errorPerApp[appSlug] = error;
      }
    }

    await prisma.bookingReference.createMany({
      data: bookingReferencesToCreate,
    });

    handleErrors({ errorPerApp, payload });
  } catch (error) {
    const errorMsg = `Error creating crm event: error: ${safeStringify(error)} Data: ${safeStringify({
      payload,
    })}`;
    log.error(`[Will retry] ${errorMsg}`);
    // Intentional rethrow to trigger retry
    throw error;
  }
}
