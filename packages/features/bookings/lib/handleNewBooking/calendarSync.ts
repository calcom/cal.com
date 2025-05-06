import type { CalendarSync } from "@prisma/client";

// eslint-disable-next-line no-restricted-imports
import { isCalendarResult } from "@calcom/lib/EventManager";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { CalendarSyncRepository } from "@calcom/lib/server/repository/calendarSync";
import type { AdditionalInformation } from "@calcom/types/Calendar";
import type { EventResult } from "@calcom/types/EventManager";

const log = logger.getSubLogger({ prefix: ["getCalendarSyncData"] });
/**
 *
 * TODO:
 * 1. Make it return null if organization doesn't have bi-directional-sync feature enabled
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
    results,
    organizerUserId,
  }: {
    results: EventResult<AdditionalInformation & { url?: string; iCalUID?: string; credentialId?: number }>[];
    organizerUserId: number;
  }
): // Adjust Omit based on actual required fields for CalendarSync creation, excluding relational keys like bookingId
{
  calendarEventId: string | null;
  data: Omit<
    CalendarSync,
    "id" | "bookingId" | "createdAt" | "updatedAt" | "subscriptionId" | "lastSyncedDownAt"
  > | null;
} => {
  type Result = (typeof results)[number];
  const validCalendarResult = results.find(
    (
      result
    ): result is {
      externalId: string;
      credentialId: number;
      calendarEventId: string | null;
    } & Result => {
      if (!isCalendarResult(result)) {
        return false;
      }
      if (!result.success) {
        log.warn("Ignoring calendar sync due to failure in creating calendar event", safeStringify(result));
        return false;
      }

      if (!result.externalId || !result.credentialId) {
        log.error(
          "Ignoring calendar sync due to missing externalCalendarId or credentialId",
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

  return {
    calendarEventId: validCalendarResult.calendarEventId,
    data: {
      externalCalendarId: validCalendarResult.externalId,
      credentialId: validCalendarResult.credentialId,
      integration: validCalendarResult.type,
      userId: organizerUserId,
      lastSyncedUpAt: new Date(),
      lastSyncDirection: "UPSTREAM",
    },
  };
};

export const createCalendarSync = async ({
  results,
  organizerUserId,
}: {
  results: EventResult<AdditionalInformation & { url?: string; iCalUID?: string; credentialId?: number }>[];
  organizerUserId: number;
}) => {
  const defaultReturnValue = {
    calendarSync: null,
    calendarEventId: null,
  };
  const { data: calendarSyncData, calendarEventId } = getCalendarSyncData({
    results,
    organizerUserId,
  });

  if (!calendarSyncData) {
    return defaultReturnValue;
  }

  let calendarSync: CalendarSync | null = null;

  if (calendarSyncData) {
    try {
      calendarSync = await CalendarSyncRepository.upsertByUserIdAndExternalCalendarIdAndIntegration({
        userId: organizerUserId,
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
  }

  return { calendarSync, calendarEventId };
};

export const getReferencesToCreateSupportingCalendarSync = <T extends { calendarEventId?: string | null }>({
  referencesToCreate,
  calendarSyncId,
  calendarEventId,
}: {
  referencesToCreate: T[];
  calendarSyncId: string | null;
  calendarEventId: string | null;
}) => {
  if (!calendarSyncId || !calendarEventId) {
    return referencesToCreate;
  }

  return referencesToCreate.map((referenceToCreate) => {
    const applicableCalendarSyncId =
      referenceToCreate.calendarEventId === calendarEventId ? calendarSyncId : null;
    return {
      ...referenceToCreate,
      calendarSyncId: applicableCalendarSyncId,
    };
  });
};
