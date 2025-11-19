import { eventTypeAppMetadataOptionalSchema } from "@calcom/app-store/zod-utils";
import { sendScheduledEmailsAndSMS, sendScheduledSeatsEmailsAndSMS } from "@calcom/emails/email-manager";
import EventManager, { placeholderCreatedEvent } from "@calcom/features/bookings/lib/EventManager";
import { doesBookingRequireConfirmation } from "@calcom/features/bookings/lib/doesBookingRequireConfirmation";
import { getAllCredentialsIncludeServiceAccountKey } from "@calcom/features/bookings/lib/getAllCredentialsForUsersOnEvent/getAllCredentials";
import { handleBookingRequested } from "@calcom/features/bookings/lib/handleBookingRequested";
import { handleConfirmation } from "@calcom/features/bookings/lib/handleConfirmation";
import { getBooking } from "@calcom/features/bookings/lib/payment/getBooking";
import {
  allowDisablingAttendeeConfirmationEmails,
  allowDisablingHostConfirmationEmails,
} from "@calcom/features/ee/workflows/lib/allowDisablingStandardEmails";
import { getPlatformParams } from "@calcom/features/platform-oauth-client/get-platform-params";
import { PlatformOAuthClientRepository } from "@calcom/features/platform-oauth-client/platform-oauth-client.repository";
import { HttpError as HttpCode } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import { BookingStatus } from "@calcom/prisma/enums";
import { EventTypeMetaDataSchema, type EventTypeMetadata } from "@calcom/prisma/zod-utils";
import { getAllWorkflowsFromEventType } from "@calcom/trpc/server/routers/viewer/workflows/util";

const log = logger.getSubLogger({ prefix: ["[handlePaymentSuccess]"] });
export async function handlePaymentSuccess(paymentId: number, bookingId: number) {
  log.debug(`handling payment success for bookingId ${bookingId}`);
  const { booking, user: userWithCredentials, evt, eventType } = await getBooking(bookingId);

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
  });

  const bookingUpdate = prisma.booking.update({
    where: {
      id: booking.id,
    },
    data: bookingData,
  });

  await prisma.$transaction([paymentUpdate, bookingUpdate]);
  if (!isConfirmed) {
    if (!requiresConfirmation) {
      await handleConfirmation({
        user: { ...userWithCredentials, credentials: allCredentials },
        evt,
        prisma,
        bookingId: booking.id,
        booking,
        paid: true,
        platformClientParams: platformOAuthClient ? getPlatformParams(platformOAuthClient) : undefined,
      });
    } else {
      await handleBookingRequested({
        evt,
        booking,
      });
      log.debug(`handling booking request for eventId ${eventType.id}`);
    }
  } else if (areEmailsEnabled) {
    const eventTypeMetadata = EventTypeMetaDataSchema.parse(eventType?.metadata || {});

    // For seated events, send emails only to the attendee who just completed payment
    if (evt.seatsPerTimeSlot) {
      // Find the attendee who just paid - it's the one with the most recently created bookingSeat
      // evt.attendees already includes bookingSeat information from getBooking()
      const attendeeWhoPaid = evt.attendees
        .filter((a) => a.bookingSeat)
        .sort((a, b) => {
          // Sort by bookingSeat.id descending to get the newest
          const aId = a.bookingSeat?.id ?? 0;
          const bId = b.bookingSeat?.id ?? 0;
          return bId - aId;
        })[0];

      if (attendeeWhoPaid) {
        const workflows = await getAllWorkflowsFromEventType(booking.eventType, booking.userId);

        let isHostConfirmationEmailsDisabled = false;
        let isAttendeeConfirmationEmailDisabled = false;

        if (workflows) {
          isHostConfirmationEmailsDisabled =
            eventTypeMetadata?.disableStandardEmails?.confirmation?.host || false;
          isAttendeeConfirmationEmailDisabled =
            eventTypeMetadata?.disableStandardEmails?.confirmation?.attendee || false;

          if (isHostConfirmationEmailsDisabled) {
            isHostConfirmationEmailsDisabled = allowDisablingHostConfirmationEmails(workflows);
          }

          if (isAttendeeConfirmationEmailDisabled) {
            isAttendeeConfirmationEmailDisabled = allowDisablingAttendeeConfirmationEmails(workflows);
          }
        }

        // Check if this is a new seat (if there are other attendees already)
        const newSeat = evt.attendees.length > 1;

        // Send emails only to the attendee who just paid
        await sendScheduledSeatsEmailsAndSMS(
          evt,
          attendeeWhoPaid,
          newSeat,
          !!evt.seatsShowAttendees,
          isHostConfirmationEmailsDisabled,
          isAttendeeConfirmationEmailDisabled,
          eventTypeMetadata
        );
      }
    } else {
      // For non-seated events, send regular emails to all attendees
      await sendScheduledEmailsAndSMS({ ...evt }, undefined, undefined, undefined, eventTypeMetadata);
    }
  }

  throw new HttpCode({
    statusCode: 200,
    message: `Booking with id '${booking.id}' was paid and confirmed.`,
  });
}
