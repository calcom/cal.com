import { eventTypeAppMetadataOptionalSchema } from "@calcom/app-store/zod-utils";
import { sendScheduledEmailsAndSMS } from "@calcom/emails/email-manager";
import EventManager, { placeholderCreatedEvent } from "@calcom/features/bookings/lib/EventManager";
import { doesBookingRequireConfirmation } from "@calcom/features/bookings/lib/doesBookingRequireConfirmation";
import { getAllCredentialsIncludeServiceAccountKey } from "@calcom/features/bookings/lib/getAllCredentialsForUsersOnEvent/getAllCredentials";
import { handleBookingRequested } from "@calcom/features/bookings/lib/handleBookingRequested";
import { handleConfirmation } from "@calcom/features/bookings/lib/handleConfirmation";
import { getBooking } from "@calcom/features/bookings/lib/payment/getBooking";
import { CreditService } from "@calcom/features/ee/billing/credit-service";
import { getBookerBaseUrl } from "@calcom/features/ee/organizations/lib/getBookerUrlServer";
import { getAllWorkflowsFromEventType } from "@calcom/features/ee/workflows/lib/getAllWorkflowsFromEventType";
import { WorkflowService } from "@calcom/features/ee/workflows/lib/service/WorkflowService";
import { getPlatformParams } from "@calcom/features/platform-oauth-client/get-platform-params";
import { PlatformOAuthClientRepository } from "@calcom/features/platform-oauth-client/platform-oauth-client.repository";
import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import sendPayload from "@calcom/features/webhooks/lib/sendOrSchedulePayload";
import type { EventPayloadType, EventTypeInfo } from "@calcom/features/webhooks/lib/sendPayload";
import { getVideoCallUrlFromCalEvent } from "@calcom/lib/CalEventParser";
import getOrgIdFromMemberOrTeamId from "@calcom/lib/getOrgIdFromMemberOrTeamId";
import { getTeamIdFromEventType } from "@calcom/lib/getTeamIdFromEventType";
import tasker from "@calcom/features/tasker";
import { HttpError as HttpCode } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { TraceContext } from "@calcom/lib/tracing";
import { distributedTracing } from "@calcom/lib/tracing/factory";
import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import { BookingStatus, WebhookTriggerEvents, WorkflowTriggerEvents } from "@calcom/prisma/enums";
import type { EventTypeMetadata } from "@calcom/prisma/zod-utils";

import { getAppActor } from "../getAppActor";

const log = logger.getSubLogger({ prefix: ["[handlePaymentSuccess]"] });

export async function handlePaymentSuccess(params: {
  paymentId: number;
  appSlug: string;
  bookingId: number;
  traceContext: TraceContext;
}) {
  const { paymentId, bookingId, appSlug, traceContext } = params;
  const updatedTraceContext = distributedTracing.updateTrace(traceContext, {
    bookingId,
    paymentId,
  });
  log.debug(`handling payment success for bookingId ${bookingId}`);
  const { booking, user: userWithCredentials, evt, eventType } = await getBooking(bookingId);
  const apps = eventTypeAppMetadataOptionalSchema.parse(eventType?.metadata?.apps);
  const actor = getAppActor({ appSlug, bookingId, apps });

  try {
    await tasker.cancelWithReference(booking.uid, "sendAwaitingPaymentEmail");
    log.debug(`Cancelled scheduled awaiting payment email for booking ${bookingId}`);
  } catch (error) {
    log.warn(
      { bookingId, error },
      `Failed to cancel awaiting payment task - email may still be sent but will be suppressed by task handler`
    );
  }

  if (booking.location) evt.location = booking.location;

  const bookingData: Prisma.BookingUpdateInput = {
    paid: true,
    status: BookingStatus.ACCEPTED,
  };

  const allCredentials = await getAllCredentialsIncludeServiceAccountKey(userWithCredentials, {
    ...booking.eventType,
    metadata: booking.eventType?.metadata as EventTypeMetadata,
  });

  const isConfirmed = booking.status === BookingStatus.ACCEPTED;

  const platformOAuthClientRepository = new PlatformOAuthClientRepository();
  const platformOAuthClient = userWithCredentials.isPlatformManaged
    ? await platformOAuthClientRepository.getByUserId(userWithCredentials.id)
    : null;
  const areCalendarEventsEnabled = platformOAuthClient?.areCalendarEventsEnabled ?? true;
  const areEmailsEnabled = platformOAuthClient?.areEmailsEnabled ?? true;

  if (isConfirmed) {
    const apps = eventTypeAppMetadataOptionalSchema.parse(eventType?.metadata?.apps);
    const eventManager = new EventManager({ ...userWithCredentials, credentials: allCredentials }, apps);
    const scheduleResult = areCalendarEventsEnabled
      ? await eventManager.create(evt)
      : placeholderCreatedEvent;
    bookingData.references = { create: scheduleResult.referencesToCreate };
  }

  const requiresConfirmation = doesBookingRequireConfirmation({
    booking: {
      ...booking,
      eventType,
    },
  });

  if (requiresConfirmation) {
    delete bookingData.status;
  }
  const paymentUpdate = prisma.payment.update({
    where: {
      id: paymentId,
    },
    data: {
      success: true,
    },
    select: {
      id: true,
      externalId: true,
    },
  });

  const bookingUpdate = prisma.booking.update({
    where: {
      id: booking.id,
    },
    data: bookingData,
    select: {
      status: true,
    },
  });

  const [payment, updatedBooking] = await prisma.$transaction([paymentUpdate, bookingUpdate]);

  const platformClientParams = platformOAuthClient ? getPlatformParams(platformOAuthClient) : undefined;
  const teamId = await getTeamIdFromEventType({
    eventType: {
      team: { id: booking.eventType?.teamId ?? null },
      parentId: booking.eventType?.parentId ?? null,
    },
  });
  const triggerForUser = !teamId || (teamId && booking.eventType?.parentId);
  const userId = triggerForUser ? booking.userId : null;
  const orgId = await getOrgIdFromMemberOrTeamId({ memberId: userId, teamId });
  const bookerUrl = await getBookerBaseUrl(orgId ?? null);

  try {
    // Get workflows for BOOKING_PAID trigger
    const workflows = await getAllWorkflowsFromEventType(booking.eventType, booking.userId);

    const paymentExternalId = payment.externalId;

    const paymentMetadata = {
      identifier: "cal.com",
      bookingId,
      eventTypeId: booking.eventType?.id ?? null,
      bookerEmail: evt.attendees[0].email,
      eventTitle: booking.eventType?.title ?? null,
      externalId: paymentExternalId ?? null,
    };

    const eventTypeInfo: EventTypeInfo = {
      eventTitle: booking.eventType?.title,
      eventDescription: booking.eventType?.description,
      requiresConfirmation: booking.eventType?.requiresConfirmation || null,
      price: booking.eventType?.price,
      currency: booking.eventType?.currency,
      length: booking.eventType?.length,
    };

    const payload: EventPayloadType = {
      ...evt,
      ...eventTypeInfo,
      bookingId,
      eventTypeId: booking.eventType?.id,
      status: updatedBooking.status,
      smsReminderNumber: booking.smsReminderNumber || undefined,
      paymentId: paymentId,
      metadata: paymentMetadata,
      ...(platformClientParams ? platformClientParams : {}),
    };

    // Trigger BOOKING_PAID webhooks
    const subscriberMeetingPaid = await getWebhooks({
      userId,
      eventTypeId: booking.eventTypeId,
      triggerEvent: WebhookTriggerEvents.BOOKING_PAID,
      teamId: booking.eventType?.teamId,
      orgId,
      oAuthClientId: platformClientParams?.platformClientId,
    });

    const tracingLogger = distributedTracing.getTracingLogger(updatedTraceContext);
    const bookingPaidSubscribers = subscriberMeetingPaid.map((sub) =>
      sendPayload(
        sub.secret,
        WebhookTriggerEvents.BOOKING_PAID,
        new Date().toISOString(),
        sub,
        payload
      ).catch((e) => {
        tracingLogger.error(
          `Error executing webhook for event: ${WebhookTriggerEvents.BOOKING_PAID}, URL: ${sub.subscriberUrl}, bookingId: ${evt.bookingId}, bookingUid: ${evt.uid}`,
          safeStringify(e)
        );
      })
    );

    // Wait for webhook invocations to finish before returning
    await Promise.all(bookingPaidSubscribers);

    // Trigger BOOKING_PAID workflows
    try {
      const meetingUrl = getVideoCallUrlFromCalEvent(evt);
      const calendarEventForWorkflow = {
        ...evt,
        eventType: {
          slug: booking.eventType?.slug || "",
          schedulingType: booking.eventType?.schedulingType,
          hosts:
            booking.eventType?.hosts?.map((host) => ({
              user: {
                email: host.user.email,
                destinationCalendar: host.user.destinationCalendar,
              },
            })) || [],
        },
        bookerUrl: bookerUrl,
        metadata: meetingUrl ? { videoCallUrl: meetingUrl } : undefined,
      };

      const creditService = new CreditService();

      await WorkflowService.scheduleWorkflowsFilteredByTriggerEvent({
        workflows,
        smsReminderNumber: booking.smsReminderNumber,
        calendarEvent: calendarEventForWorkflow,
        hideBranding: !!booking.eventType?.owner?.hideBranding,
        triggers: [WorkflowTriggerEvents.BOOKING_PAID],
        creditCheckFn: creditService.hasAvailableCredits.bind(creditService),
      });
    } catch (error) {
      log.error("Error while scheduling workflow reminders for booking paid", safeStringify(error));
    }
  } catch (error) {
    log.error("Error while triggering BOOKING_PAID webhook", safeStringify(error));
  }

  if (!isConfirmed) {
    if (!requiresConfirmation) {
      await handleConfirmation({
        user: { ...userWithCredentials, credentials: allCredentials },
        evt,
        prisma,
        bookingId: booking.id,
        booking,
        paid: true,
        platformClientParams,
        traceContext: updatedTraceContext,
        actionSource: "WEBHOOK",
        actor,
      });
    } else {
      await handleBookingRequested({
        evt,
        booking,
      });
      log.debug(`handling booking request for eventId ${eventType.id}`);
    }
  } else if (areEmailsEnabled) {
    await sendScheduledEmailsAndSMS({ ...evt }, undefined, undefined, undefined, eventType.metadata);
  }

  throw new HttpCode({
    statusCode: 200,
    message: `Booking with id '${booking.id}' was paid and confirmed.`,
  });
}
