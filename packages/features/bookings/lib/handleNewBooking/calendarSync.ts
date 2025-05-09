import type { CalendarSync } from "@prisma/client";

import { CalendarSyncRepository } from "@calcom/features/calendar-sync/calendarSync.repository";
import { featureName } from "@calcom/features/calendar-sync/feature";
// eslint-disable-next-line no-restricted-imports
import { isCalendarLikeResult } from "@calcom/lib/EventManager";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { AdditionalInformation } from "@calcom/types/Calendar";
import type { EventResult } from "@calcom/types/EventManager";
import type { Ensure } from "@calcom/types/utils";

const log = logger.getSubLogger({ prefix: [featureName, "calendarSync"] });
/**
 * Extracts data required to create CalendarSync records from EventManager results.
 * It uses the credentialId assumed to be present on successful calendar integration results.
 *
 * @param results - The results array from EventManager operations (create/reschedule), potentially containing credentialId.
 * @param bookingId - The ID of the booking for logging purposes.
 * @returns An array of data objects suitable for `prisma.calendarSync.createMany.data`.
 */
export const getCalendarSyncData = (
  // Assuming EventResult might contain credentialId for successful calendar ops
  {
    calendarResults,
    organizer,
  }: {
    calendarResults: EventResult<
      AdditionalInformation & {
        id?: string | null;
        url?: string;
        iCalUID?: string;
        credentialId?: number;
        calendarEventId?: string | null;
      }
    >[];
    organizer: {
      id: number;
      organizationId: number | null;
    };
  }
): {
  calendarEventId: string | null;
  data: Ensure<
    Omit<
      CalendarSync,
      "id" | "bookingId" | "createdAt" | "updatedAt" | "subscriptionId" | "lastSyncedDownAt"
    >,
    "lastSyncDirection"
  > | null;
} => {
  type Result = (typeof calendarResults)[number];
  const validCalendarResult = calendarResults.find(
    (
      result
    ): result is {
      externalId: string;
      credentialId: number;
      calendarEventId: string | null;
    } & Result => {
      if (!result.success) {
        log.warn("Ignoring calendar sync due to failure in creating calendar event", safeStringify(result));
        return false;
      }

      if (!result.externalId || !result.credentialId) {
        // Could cause issues syncing calendar events downstream
        // We don't want to fail the booking
        log.error(
          "Calendar sync setup failure due to missing externalId or credentialId in result from EventManager",
          safeStringify({
            externalId: result.externalId,
            credentialId: result.credentialId,
          })
        );
        return false;
      }

      return true;
    }
  );

  if (!validCalendarResult) {
    return {
      calendarEventId: null,
      data: null,
    };
  }

  const event =
    (validCalendarResult.updatedEvent instanceof Array
      ? validCalendarResult.updatedEvent[0]
      : validCalendarResult.updatedEvent) ?? validCalendarResult.createdEvent;

  return {
    calendarEventId: event?.id ?? null,
    data: {
      externalCalendarId: validCalendarResult.externalId,
      credentialId: validCalendarResult.credentialId,
      integration: validCalendarResult.type,
      userId: organizer.id,
      lastSyncedUpAt: new Date(),
      lastSyncDirection: "UPSTREAM",
    },
  };
};

/**
 * TODO: It needs to have feature flag support for bi-directional sync. Till then we make this fn no--op
 * That requires teamFeatures table to be queried
 */
export const createCalendarSync = async ({
  results,
  organizer,
}: {
  results: EventResult<AdditionalInformation & { url?: string; iCalUID?: string; credentialId?: number }>[];
  organizer: {
    id: number;
    organizationId: number | null;
  };
}) => {
  // TODO: Remove this once we have feature flag support for bi-directional sync - Regular feature flag check could be costly in booking flow
  // return null;
  const calendarResults = results.filter((result) => isCalendarLikeResult(result));
  if (calendarResults.length === 0) {
    // No calendars are connected it seems, so there is no need for calendar sync
    return {
      calendarSync: null,
      calendarEventId: null,
    };
  }
  const defaultReturnValue = {
    calendarSync: null,
    calendarEventId: null,
  };
  const { data: calendarSyncData, calendarEventId } = getCalendarSyncData({
    calendarResults,
    organizer,
  });

  if (!calendarSyncData) {
    return defaultReturnValue;
  }

  let calendarSync: CalendarSync | null = null;

  if (calendarSyncData) {
    log.debug("Creating calendarSync", safeStringify(calendarSyncData));
    try {
      calendarSync = await CalendarSyncRepository.upsertByUserIdAndExternalCalendarIdAndIntegration({
        userId: organizer.id,
        externalCalendarId: calendarSyncData.externalCalendarId,
        integration: calendarSyncData.integration,
        createData: calendarSyncData,
        updateData: {
          // Update to the last used credential that worked
          credentialId: calendarSyncData.credentialId,
          lastSyncedUpAt: calendarSyncData.lastSyncedUpAt,
          lastSyncDirection: calendarSyncData.lastSyncDirection,
        },
      });
    } catch (error) {
      log.error("Error while upserting calendarSync", safeStringify(error));
      return defaultReturnValue;
    }
  } else {
    log.debug("No calendarSyncData found");
  }

  return { calendarSync, calendarEventId };
};

export const getReferencesToCreateSupportingCalendarSync = <T extends { uid?: string | null }>({
  referencesToCreate,
  calendarSyncId,
  calendarEventId,
}: {
  referencesToCreate: T[];
  calendarSyncId: string | null;
  calendarEventId: string | null;
}) => {
  if (!calendarSyncId) {
    // No calendarSyncId means that no calendar sync was created for whatever reason, which would have been logged earlier
    return referencesToCreate;
  }

  if (!calendarEventId) {
    // We don't want to fail the booking - but this shouldn't happen because calendarSync creation means that a successful calendar event was created earlier and we must have calendarEventId for it.
    log.warn(
      "Issue while linking BookingReference to CalendarSync as calendarSyncId is set but calendarEventId is not available",
      safeStringify({ calendarSyncId, calendarEventId })
    );
    return referencesToCreate;
  }

  const newReferencesToCreate = referencesToCreate.map((referenceToCreate) => {
    const applicableCalendarSyncId = referenceToCreate.uid === calendarEventId ? calendarSyncId : null;
    console.log("applicableCalendarSyncId", applicableCalendarSyncId, {
      referenceToCreate,
      calendarEventId,
    });
    return {
      ...referenceToCreate,
      calendarSyncId: applicableCalendarSyncId,
    };
  });

  log.debug("New referencesToCreate after linking to CalendarSync", safeStringify(newReferencesToCreate));

  return newReferencesToCreate;
};
