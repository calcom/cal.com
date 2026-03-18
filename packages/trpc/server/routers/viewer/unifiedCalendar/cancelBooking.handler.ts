import { triggerBookingEmails } from "@calcom/features/bookings/lib/handleNewBooking/triggerBookingEmails";
import EventManager from "@calcom/lib/EventManager";
import { getUsersCredentialsIncludeServiceAccountKey } from "@calcom/lib/server/getUsersCredentials";
import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import { buildUnifiedCalendarEvent } from "./bookingLifecycle.shared";
import type {
  TUnifiedCalendarCancelBookingInput,
  TUnifiedCalendarCancelBookingOutput,
} from "./cancelBooking.schema";

type CancelBookingOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TUnifiedCalendarCancelBookingInput;
};

export const cancelUnifiedCalendarBookingHandler = async ({
  ctx,
  input,
}: CancelBookingOptions): Promise<TUnifiedCalendarCancelBookingOutput> => {
  const booking = await prisma.booking.findFirst({
    where: {
      id: input.bookingId,
      userId: ctx.user.id,
    },
    select: {
      id: true,
      uid: true,
      title: true,
      description: true,
      startTime: true,
      endTime: true,
      location: true,
      iCalUID: true,
      status: true,
      destinationCalendar: true,
      attendees: {
        select: {
          email: true,
          name: true,
          locale: true,
          timeZone: true,
          phoneNumber: true,
        },
      },
      references: {
        select: {
          type: true,
          uid: true,
          meetingId: true,
          meetingPassword: true,
          meetingUrl: true,
          externalCalendarId: true,
          thirdPartyRecurringEventId: true,
          credentialId: true,
          delegationCredentialId: true,
        },
      },
    },
  });

  if (!booking) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Booking not found",
    });
  }

  if (booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.REJECTED) {
    return {
      bookingId: booking.id,
      bookingUid: booking.uid,
      status: "CANCELLED",
    };
  }

  const cancellationReason = input.cancellationReason?.trim() || null;

  const credentials = await getUsersCredentialsIncludeServiceAccountKey(ctx.user);
  const eventManager = new EventManager({
    ...ctx.user,
    credentials,
  });

  const calEvent = await buildUnifiedCalendarEvent({
    booking,
    destinationCalendar: booking.destinationCalendar,
    organizer: ctx.user,
    attendees: booking.attendees,
    cancellationReason,
  });

  if (booking.references.length > 0) {
    await eventManager.cancelEvent(calEvent, booking.references);
  }

  const cancelledBooking = await prisma.booking.update({
    where: {
      id: booking.id,
    },
    data: {
      status: BookingStatus.CANCELLED,
      cancellationReason,
      cancelledBy: ctx.user.email,
    },
  });

  await triggerBookingEmails({
    calEvent,
    emailType: "cancelled",
    isHostConfirmationEmailsDisabled: false,
    isAttendeeConfirmationEmailDisabled: false,
    hasRelevantSmsWorkflow: false,
  });

  return {
    bookingId: cancelledBooking.id,
    bookingUid: cancelledBooking.uid,
    status: "CANCELLED",
  };
};
