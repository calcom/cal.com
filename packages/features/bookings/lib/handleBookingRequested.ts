import { sendAttendeeRequestEmailAndSMS, sendOrganizerRequestEmail } from "@calcom/emails";
import { getWebhookPayloadForBooking } from "@calcom/features/bookings/lib/getWebhookPayloadForBooking";
import type { Workflow } from "@calcom/features/ee/workflows/lib/types";
import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import sendPayload from "@calcom/features/webhooks/lib/sendOrSchedulePayload";
import getOrgIdFromMemberOrTeamId from "@calcom/lib/getOrgIdFromMemberOrTeamId";
import { shouldHideBrandingForEvent } from "@calcom/lib/hideBranding";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { WorkflowService } from "@calcom/lib/server/service/workflows";
import prisma from "@calcom/prisma";
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
        id: number;
        hideBranding: boolean;
      } | null;
      team?: {
        parentId: number | null;
        hideBranding: boolean | null;
        parent?: {
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
    id: number;
  };
}) {
  const { evt, booking } = args;

  log.debug("Emails: Sending booking requested emails");

  const teamForBranding = booking.eventType?.teamId
    ? await prisma.team.findUnique({
        where: { id: booking.eventType.teamId },
        select: {
          id: true,
          hideBranding: true,
          parentId: true,
          parent: {
            select: {
              hideBranding: true,
            },
          },
        },
      })
    : null;

  const organizationIdForBranding = teamForBranding?.parentId
    ? teamForBranding.parentId
    : (
        await prisma.profile.findFirst({
          where: { userId: booking.userId ?? undefined },
          select: { organizationId: true },
        })
      )?.organizationId ?? null;

  // Fetch user data for branding when there's no team
  const userForBranding =
    !booking.eventType?.teamId && booking.userId
      ? await prisma.user.findUnique({
          where: { id: booking.userId },
          select: {
            id: true,
            hideBranding: true,
          },
        })
      : null;

  const eventTypeId = booking.eventType?.id ?? booking.eventTypeId ?? null;
  const hideBranding = eventTypeId
    ? await shouldHideBrandingForEvent({
        eventTypeId,
        team: (teamForBranding as any) ?? null,
        owner: userForBranding,
        organizationId: organizationIdForBranding,
      })
    : false;

  await sendOrganizerRequestEmail(
    { ...evt, hideBranding } as any,
    booking?.eventType?.metadata as EventTypeMetadata
  );
  await sendAttendeeRequestEmailAndSMS(
    { ...evt },
    { ...evt, hideBranding } as any,
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
      try {
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
      } catch (error) {
        log.error("Error scheduling workflows", safeStringify(error));
      }
    }
  } catch (error) {
    // Silently fail
    log.error("Error in handleBookingRequested", safeStringify(error));
  }
}
