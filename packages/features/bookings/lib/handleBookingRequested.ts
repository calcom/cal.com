import { sendAttendeeRequestEmailAndSMS, sendOrganizerRequestEmail } from "@calcom/emails";
import { getWebhookPayloadForBooking } from "@calcom/features/bookings/lib/getWebhookPayloadForBooking";
import { WorkflowService } from "@calcom/features/ee/workflows/lib/service/WorkflowService";
import type { Workflow } from "@calcom/features/ee/workflows/lib/types";
import { shouldHideBrandingForEventWithPrisma } from "@calcom/features/profile/lib/hideBranding";
import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import sendPayload from "@calcom/features/webhooks/lib/sendOrSchedulePayload";
import getOrgIdFromMemberOrTeamId from "@calcom/lib/getOrgIdFromMemberOrTeamId";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { Prisma } from "@calcom/prisma/client";
import { WebhookTriggerEvents, WorkflowTriggerEvents } from "@calcom/prisma/enums";
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
    smsReminderNumber: string | null;
    eventType: {
      workflows: {
        workflow: Workflow;
      }[];
      owner: {
        hideBranding: boolean;
      } | null;
      team?: {
        parentId: number | null;
        hideBranding: boolean | null;
        parent: {
          hideBranding: boolean | null;
        } | null;
      } | null;
      currency: string;
      hosts?: {
        user: {
          email: string;
          destinationCalendar?: {
            primaryEmail: string | null;
          } | null;
        };
      }[];
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
    user?: {
      id: number;
      hideBranding: boolean | null;
    } | null;
    id: number;
  };
}) {
  const { evt, booking } = args;

  log.debug("Emails: Sending booking requested emails");

  const eventTypeId = booking.eventType?.id ?? booking.eventTypeId ?? null;
  let hideBranding = false;

  if (!eventTypeId) {
    log.warn("Booking missing eventTypeId, defaulting hideBranding to false", {
      bookingId: booking.id,
      userId: booking.userId,
    });
    hideBranding = false;
  } else {
    hideBranding = await shouldHideBrandingForEventWithPrisma({
      eventTypeId,
      team: booking.eventType?.team ?? null,
      owner: booking.user ?? null,
      organizationId: booking.eventType?.team?.parentId ?? null,
    });
  }

  await sendOrganizerRequestEmail(
    { ...evt, hideBranding },
    booking?.eventType?.metadata as EventTypeMetadata
  );
  await sendAttendeeRequestEmailAndSMS(
    { ...evt, hideBranding },
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

    const workflows = await getAllWorkflowsFromEventType(booking.eventType, booking.userId);
    if (workflows.length > 0) {
      await WorkflowService.scheduleWorkflowsFilteredByTriggerEvent({
        workflows,
        smsReminderNumber: booking.smsReminderNumber,
        hideBranding,
        calendarEvent: {
          ...evt,
          bookerUrl: evt.bookerUrl as string,
          eventType: {
            slug: evt.type,
            hosts: booking.eventType?.hosts,
            schedulingType: evt.schedulingType,
          },
        },
        triggers: [WorkflowTriggerEvents.BOOKING_REQUESTED],
      });
    }
  } catch (error) {
    // Silently fail
    log.error("Error in handleBookingRequested", safeStringify(error));
  }
}
