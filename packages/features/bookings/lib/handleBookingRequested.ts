import type { Prisma } from "@prisma/client";

import { sendAttendeeRequestEmailAndSMS, sendOrganizerRequestEmail } from "@calcom/emails";
import { getWebhookPayloadForBooking } from "@calcom/features/bookings/lib/getWebhookPayloadForBooking";
import { sendBookingRequestedRejectedReminders } from "@calcom/features/ee/workflows/lib/reminders/reminderScheduler";
import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import sendPayload from "@calcom/features/webhooks/lib/sendOrSchedulePayload";
import { getVideoCallUrlFromCalEvent } from "@calcom/lib/CalEventParser";
import getOrgIdFromMemberOrTeamId from "@calcom/lib/getOrgIdFromMemberOrTeamId";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { SchedulingType } from "@calcom/prisma/enums";
import { BookingStatus, WebhookTriggerEvents } from "@calcom/prisma/enums";
import type { EventTypeMetadata } from "@calcom/prisma/zod-utils";
import { getAllWorkflowsFromEventType } from "@calcom/trpc/server/routers/viewer/workflows/util";
import type { CalendarEvent } from "@calcom/types/Calendar";

const log = logger.getSubLogger({ prefix: ["[handleBookingRequested] book:user"] });

/**
 * Supposed to do whatever is needed when a booking is requested.
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
      slug: string;
      schedulingType?: SchedulingType | null | undefined;
      hosts?:
        | {
            user: { email: string; destinationCalendar?: { primaryEmail: string | null } | null | undefined };
          }[]
        | undefined;
    } | null;
    eventTypeId: number | null;
    smsReminderNumber: string | null;
    userId: number | null;
    id: number;
  };
}) {
  const { evt, booking } = args;

  log.debug("Emails: Sending booking requested emails");

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
    const subscribersBookingRequested = await getWebhooks({
      userId: booking.userId,
      eventTypeId: booking.eventTypeId,
      triggerEvent: WebhookTriggerEvents.BOOKING_REQUESTED,
      teamId: booking.eventType?.teamId,
      orgId,
    });

    const webhookPayload = getWebhookPayloadForBooking({
      booking,
      evt,
    });

    const promises = subscribersBookingRequested.map((sub) =>
      sendPayload(
        sub.secret,
        WebhookTriggerEvents.BOOKING_REQUESTED,
        new Date().toISOString(),
        sub,
        webhookPayload
      ).catch((e) => {
        log.error(
          `Error executing webhook for event: ${WebhookTriggerEvents.BOOKING_REQUESTED}, URL: ${sub.subscriberUrl}, bookingId: ${evt.bookingId}, bookingUid: ${evt.uid}`,
          safeStringify(e)
        );
      })
    );
    await Promise.all(promises);

    const workflows = await getAllWorkflowsFromEventType(booking.eventType);
    const workflowEventWithMetadata = { videoCallUrl: getVideoCallUrlFromCalEvent(evt) };
    const { eventType } = booking;

    await sendBookingRequestedRejectedReminders({
      bookingStatus: BookingStatus.PENDING,
      workflows,
      calendarEvent: {
        ...evt,
        metadata: workflowEventWithMetadata,
        eventType: {
          slug: eventType?.slug as string,
          hosts: eventType?.hosts,
          schedulingType: eventType?.schedulingType,
        },
        bookerUrl: "",
      },
      smsReminderNumber: booking.smsReminderNumber || null,
    });
  } catch (error) {
    // Silently fail
    log.error("Error in handleBookingRequested", safeStringify(error));
  }
}
