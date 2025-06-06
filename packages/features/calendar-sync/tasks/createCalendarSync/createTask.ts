import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import tasker from "@calcom/features/tasker";
// eslint-disable-next-line no-restricted-imports
import { isCalendarLikeResult } from "@calcom/lib/EventManager";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { AdditionalInformation } from "@calcom/types/Calendar";
import type { EventResult } from "@calcom/types/EventManager";

import { featureName } from "../../feature";

const log = logger.getSubLogger({ prefix: [featureName, "tasks"] });
type CalendarResults = EventResult<
  AdditionalInformation & {
    id?: string | null;
    url?: string;
    iCalUID?: string;
    credentialId?: number;
    calendarEventId?: string | null;
  }
>[];
/**
 * Extracts data required to create CalendarSync records from EventManager results.
 * It uses the credentialId assumed to be present on successful calendar integration results.
 *
 * @param results - The results array from EventManager operations (create/reschedule), potentially containing credentialId.
 * @param bookingId - The ID of the booking for logging purposes.
 * @returns An array of data objects suitable for `prisma.calendarSync.createMany.data`.
 */
const getCalendarSyncData = (
  // Assuming EventResult might contain credentialId for successful calendar ops
  {
    calendarResults,
    organizer,
  }: {
    calendarResults: CalendarResults;
    organizer: {
      id: number;
      organizationId: number | null;
    };
  }
) => {
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
      lastSyncedUpAt: Date.now(),
      lastSyncDirection: "UPSTREAM" as const,
    },
  };
};

export const createCalendarSyncTask = async ({
  results,
  organizer,
}: {
  results: CalendarResults;
  organizer: {
    id: number;
    organizationId: number | null;
  };
}) => {
  const defaultReturnValue = {
    calendarSync: null,
    calendarEventId: null,
  };
  try {
    const organizationId = organizer.organizationId;
    if (!organizationId) {
      log.debug("Organizer is not part of an organization, skipping calendar sync task");
      return defaultReturnValue;
    }
    const featuresRepository = new FeaturesRepository();
    const isBiDirectionalSyncEnabled = await featuresRepository.checkIfTeamDirectlyHasFeature({
      teamId: organizationId,
      featureId: "calendar-sync",
    });

    if (!isBiDirectionalSyncEnabled) {
      log.debug(
        `Calendar sync is not enabled for organizationId  ${organizationId}, skipping calendar sync task`
      );
      return defaultReturnValue;
    }
    const calendarResults = results.filter((result) => isCalendarLikeResult(result));
    if (calendarResults.length === 0) {
      // No calendars are connected it seems, so there is no need for calendar sync
      return {
        calendarSync: null,
        calendarEventId: null,
      };
    }
    const { calendarEventId, data } = getCalendarSyncData({ calendarResults, organizer });
    if (!calendarEventId || !data) {
      return defaultReturnValue;
    }
    log.debug("Creating calendar sync task", safeStringify({ calendarEventId, calendarSyncData: data }));
    return tasker.create(
      "createCalendarSync",
      { calendarEventId, calendarSyncData: data },
      { maxAttempts: 3 }
    );
  } catch (error) {
    log.error("Error while creating calendar sync task", safeStringify(error));
    return defaultReturnValue;
  }
};
