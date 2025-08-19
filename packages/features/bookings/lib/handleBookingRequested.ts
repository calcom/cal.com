import type { Prisma } from "@prisma/client";

import { sendAttendeeRequestEmailAndSMS, sendOrganizerRequestEmail } from "@calcom/emails";
import { BookingWebhookService } from "@calcom/features/webhooks/lib/service/BookingWebhookService";
import getOrgIdFromMemberOrTeamId from "@calcom/lib/getOrgIdFromMemberOrTeamId";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { EventTypeMetadata } from "@calcom/prisma/zod-utils";
import type { CalendarEvent } from "@calcom/types/Calendar";

const log = logger.getSubLogger({ prefix: ["[handleBookingRequested] book:user"] });

/**
 * Handles booking requested events using the new webhook architecture
 */
export async function handleBookingRequested(args: {
  evt: CalendarEvent;
  booking: {
    eventType: {
      team?: {
        parentId: number | null;
      } | null;
      currency: string;
      description: string | null;
      id: number;
      length: number;
      price: number;
      requiresConfirmation: boolean;
      title: string;
      teamId?: number | null;
      metadata: Prisma.JsonValue;
    } | null;
    eventTypeId: number | null;
    userId: number | null;
    id: number;
  };
  isDryRun?: boolean;
}) {
  const { evt, booking, isDryRun } = args;

  log.debug("Emails: Sending booking requested emails");

  // Send emails (unchanged from original)
  await sendOrganizerRequestEmail({ ...evt }, booking?.eventType?.metadata as EventTypeMetadata);
  await sendAttendeeRequestEmailAndSMS(
    { ...evt },
    evt.attendees[0],
    booking?.eventType?.metadata as EventTypeMetadata
  );

  const orgId = await getOrgIdFromMemberOrTeamId({
    memberId: booking.userId,
    teamId: booking.eventType?.teamId,
  });

  try {
    // Use new webhook architecture
    await BookingWebhookService.emitBookingRequested({
      evt,
      booking: {
        id: booking.id,
        eventTypeId: booking.eventTypeId,
        userId: booking.userId,
      },
      eventType: booking.eventType ? {
        id: booking.eventType.id,
        title: booking.eventType.title,
        description: booking.eventType.description,
        requiresConfirmation: booking.eventType.requiresConfirmation,
        price: booking.eventType.price,
        currency: booking.eventType.currency,
        length: booking.eventType.length,
        teamId: booking.eventType.teamId,
      } : null,
      teamId: booking.eventType?.teamId,
      orgId,
      isDryRun,
    });

    log.debug("Successfully sent booking requested webhook");
  } catch (error) {
    // Silently fail - webhooks shouldn't break the main flow
    log.error("Error in handleBookingRequested", safeStringify(error));
  }
}
