import { CalendarSubscriptionService } from "@calcom/features/calendar-sync/calendarSubscription.service";
import { CalendarSyncRepository } from "@calcom/features/calendar-sync/calendarSync.repository";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { BookingReferenceRepository } from "@calcom/lib/server/repository/bookingReference";
import { CalendarSubscriptionStatus } from "@calcom/prisma/enums";

import { createCalendarSyncSchema } from "./schema";

const log = logger.getSubLogger({ prefix: [`[[tasker] createCalendarSync]`] });

export async function handler(payload: string): Promise<void> {
  const { calendarEventId, calendarSyncData } = createCalendarSyncSchema.parse(JSON.parse(payload));
  log.debug("Creating calendarSync", safeStringify({ calendarEventId }));
  try {
    const lastSyncedUpAt = new Date(calendarSyncData.lastSyncedUpAt);
    const createdCalendarSync =
      await CalendarSyncRepository.upsertByUserIdAndExternalCalendarIdAndIntegration({
        userId: calendarSyncData.userId,
        externalCalendarId: calendarSyncData.externalCalendarId,
        integration: calendarSyncData.integration,
        createData: {
          ...calendarSyncData,
          lastSyncedUpAt,
        },
        updateData: {
          // Update to the last used credential that worked
          credentialId: calendarSyncData.credentialId,
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
    log.error("Error while creating calendarSync", safeStringify(error));
    throw error;
  }
}
