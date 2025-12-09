import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import sendPayload from "@calcom/features/webhooks/lib/sendOrSchedulePayload";
import type { EventPayloadType, EventTypeInfo } from "@calcom/features/webhooks/lib/sendPayload";
import getOrgIdFromMemberOrTeamId from "@calcom/lib/getOrgIdFromMemberOrTeamId";
import { getTeamIdFromEventType } from "@calcom/lib/getTeamIdFromEventType";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { PrismaClient } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import type { PlatformClientParams } from "@calcom/prisma/zod-utils";
import type { CalendarEvent } from "@calcom/types/Calendar";

const log = logger.getSubLogger({ prefix: ["[triggerBookingPaidWebhook]"] });

/**
 * Triggers BOOKING_PAID webhook when a booking payment is successful.
 * This should be called whenever a booking is marked as paid, regardless of booking status.
 */
export async function triggerBookingPaidWebhook(args: {
  evt: CalendarEvent;
  prisma: PrismaClient;
  bookingId: number;
  booking: {
    eventTypeId: number | null;
    userId: number | null;
    smsReminderNumber: string | null;
    eventType: {
      id: number;
      title: string;
      currency: string;
      description: string | null;
      length: number;
      price: number;
      requiresConfirmation: boolean;
      teamId?: number | null;
      parentId?: number | null;
      team?: {
        parentId: number | null;
      } | null;
    } | null;
  };
  platformClientParams?: PlatformClientParams;
}) {
  const { evt, prisma, bookingId, booking, platformClientParams } = args;
  const eventType = booking.eventType;

  if (!eventType) {
    log.warn(`Cannot trigger BOOKING_PAID webhook: eventType is null for bookingId ${bookingId}`);
    return;
  }

  try {
    const teamId = await getTeamIdFromEventType({
      eventType: {
        team: { id: eventType.teamId ?? null },
        parentId: eventType.parentId ?? null,
      },
    });

    const triggerForUser = !teamId || (teamId && eventType.parentId);
    const userId = triggerForUser ? booking.userId : null;
    const orgId = await getOrgIdFromMemberOrTeamId({ memberId: userId, teamId });

    // Get payment information
    const bookingWithPayment = await prisma.booking.findUnique({
      where: {
        id: bookingId,
      },
      select: {
        payment: {
          select: {
            id: true,
            success: true,
            externalId: true,
          },
        },
      },
    });

    const successPayment = bookingWithPayment?.payment?.find((item) => item.success);
    const paymentExternalId = successPayment?.externalId;

    // Get webhook subscribers for BOOKING_PAID
    const subscriberMeetingPaid = await getWebhooks({
      userId,
      eventTypeId: booking.eventTypeId,
      triggerEvent: WebhookTriggerEvents.BOOKING_PAID,
      teamId: eventType.teamId,
      orgId,
      oAuthClientId: platformClientParams?.platformClientId,
    });

    if (subscriberMeetingPaid.length === 0) {
      log.debug(`No BOOKING_PAID webhook subscribers found for bookingId ${bookingId}`);
      return;
    }

    // Build event type info
    const eventTypeInfo: EventTypeInfo = {
      eventTitle: eventType.title,
      eventDescription: eventType.description,
      requiresConfirmation: eventType.requiresConfirmation || null,
      price: eventType.price,
      currency: eventType.currency,
      length: eventType.length,
    };

    // Build payload
    const paymentMetadata = {
      identifier: "cal.com",
      bookingId,
      eventTypeId: eventType.id,
      bookerEmail: evt.attendees[0]?.email,
      eventTitle: eventType.title,
      externalId: paymentExternalId,
    };

    const payload: EventPayloadType = {
      ...evt,
      ...eventTypeInfo,
      bookingId,
      eventTypeId: eventType.id,
      status: "ACCEPTED",
      smsReminderNumber: booking.smsReminderNumber || undefined,
      paymentId: bookingWithPayment?.payment?.[0]?.id,
      metadata: {
        ...(evt.metadata || {}),
        ...paymentMetadata,
      },
      ...(platformClientParams ? platformClientParams : {}),
    };

    // Send webhooks to all subscribers
    const bookingPaidSubscribers = subscriberMeetingPaid.map((sub) =>
      sendPayload(
        sub.secret,
        WebhookTriggerEvents.BOOKING_PAID,
        new Date().toISOString(),
        sub,
        payload
      ).catch((e) => {
        log.error(
          `Error executing webhook for event: ${WebhookTriggerEvents.BOOKING_PAID}, URL: ${sub.subscriberUrl}, bookingId: ${evt.bookingId}, bookingUid: ${evt.uid}`,
          safeStringify(e)
        );
      })
    );

    // Don't await - fire and forget
    Promise.all(bookingPaidSubscribers);
    log.debug(
      `Triggered BOOKING_PAID webhook for bookingId ${bookingId} to ${subscriberMeetingPaid.length} subscribers`
    );
  } catch (error) {
    log.error(`Error triggering BOOKING_PAID webhook for bookingId ${bookingId}`, safeStringify(error));
  }
}
