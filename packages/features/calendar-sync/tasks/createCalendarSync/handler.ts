import type { z } from "zod";

import { CalendarSubscriptionService } from "@calcom/features/calendar-sync/calendarSubscription.service";
import { CalendarSyncRepository } from "@calcom/features/calendar-sync/calendarSync.repository";
import { isInMemoryDelegationCredential } from "@calcom/lib/delegationCredential/clientAndServer";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { BookingReferenceRepository } from "@calcom/lib/server/repository/bookingReference";
import { CredentialRepository } from "@calcom/lib/server/repository/credential";
import { CalendarSubscriptionStatus } from "@calcom/prisma/enums";

import { createCalendarSyncSchema } from "./schema";

type TCalendarSyncData = z.infer<typeof createCalendarSyncSchema>["calendarSyncData"];
const log = logger.getSubLogger({ prefix: [`[[tasker] createCalendarSync]`] });

/**
 * Returns the credentialId for non-inmemory delegation credentials, otherwise ensures that Delegation User credential is in DB and returns the credentialId
 * This is necessary because we use in-memory delegation credentials in booking creation flow which creates the task. Read delegation-credentials/README.md for more details.
 */
async function getOrCreateCredentialId({
  calendarSyncData,
}: {
  calendarSyncData: Pick<
    TCalendarSyncData,
    "userId" | "delegationCredentialId" | "integration" | "credentialId"
  >;
}) {
  let credentialId: number = calendarSyncData.credentialId;
  if (!isInMemoryDelegationCredential({ credentialId })) {
    return credentialId;
  }
  if (calendarSyncData.delegationCredentialId) {
    log.debug(
      "Trying to use Delegation User Credential for calendar sync",
      safeStringify({
        userId: calendarSyncData.userId,
        delegationCredentialId: calendarSyncData.delegationCredentialId,
        integration: calendarSyncData.integration,
      })
    );
    let delegationUserCredential = await CredentialRepository.findUniqueByUserIdAndDelegationCredentialId({
      userId: calendarSyncData.userId,
      delegationCredentialId: calendarSyncData.delegationCredentialId,
    });
    if (!delegationUserCredential) {
      log.debug(
        "Delegation User Credential not found, creating one for calendar sync",
        safeStringify({
          userId: calendarSyncData.userId,
          delegationCredentialId: calendarSyncData.delegationCredentialId,
          integration: calendarSyncData.integration,
        })
      );
      const credentialType = calendarSyncData.integration;
      // TODO: Write a comprehensive function to get app slug based on credentialType for all calendars
      // Support more calendars here
      const appId = credentialType === "google_calendar" ? "google-calendar" : null;
      if (!appId) {
        throw new Error(`App ID not found for credential type: ${credentialType}`);
      }
      delegationUserCredential = await CredentialRepository.createDelegationCredential({
        userId: calendarSyncData.userId,
        delegationCredentialId: calendarSyncData.delegationCredentialId,
        type: credentialType,
        key: {},
        appId,
      });
    }
    log.debug("Created delegation credential", safeStringify({ delegationUserCredential }));
    credentialId = delegationUserCredential.id;
  }
  log.error(
    "Neither delegationCredentialId is set, nor credentialId is in DB",
    safeStringify({
      calendarSyncData: {
        userId: calendarSyncData.userId,
        delegationCredentialId: calendarSyncData.delegationCredentialId,
        integration: calendarSyncData.integration,
        credentialId: credentialId,
      },
    })
  );
  return credentialId;
}

export async function handler(payload: string): Promise<void> {
  const { calendarEventId, calendarSyncData } = createCalendarSyncSchema.parse(JSON.parse(payload));
  log.debug("Processing createCalendarSync task", safeStringify({ calendarEventId }));
  try {
    const lastSyncedUpAt = new Date(calendarSyncData.lastSyncedUpAt);
    const credentialId = await getOrCreateCredentialId({ calendarSyncData });
    const createdCalendarSync =
      await CalendarSyncRepository.upsertByUserIdAndExternalCalendarIdAndIntegration({
        userId: calendarSyncData.userId,
        externalCalendarId: calendarSyncData.externalCalendarId,
        integration: calendarSyncData.integration,
        createData: {
          credentialId,
          userId: calendarSyncData.userId,
          externalCalendarId: calendarSyncData.externalCalendarId,
          integration: calendarSyncData.integration,
          lastSyncedUpAt: new Date(calendarSyncData.lastSyncedUpAt),
          lastSyncDirection: calendarSyncData.lastSyncDirection,
        },
        updateData: {
          // Update to the last used credential that worked
          credentialId,
          lastSyncedUpAt,
          lastSyncDirection: calendarSyncData.lastSyncDirection,
        },
      });

    await BookingReferenceRepository.setCalendarSyncIdForBookingReferences({
      calendarEventId,
      calendarSyncId: createdCalendarSync.id,
    });

    await CalendarSubscriptionService.createIfNotExists({
      credentialId: createdCalendarSync.credentialId,
      externalCalendarId: createdCalendarSync.externalCalendarId,
      data: {
        providerType: createdCalendarSync.integration,
        status: CalendarSubscriptionStatus.PENDING,
        calendarSyncId: createdCalendarSync.id,
      },
    });
  } catch (error) {
    log.error("Error in process of createCalendarSync task", safeStringify(error));
    throw error;
  }
}
