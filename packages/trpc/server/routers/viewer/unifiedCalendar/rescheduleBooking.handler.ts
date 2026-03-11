import { triggerBookingEmails } from "@calcom/features/bookings/lib/handleNewBooking/triggerBookingEmails";
import EventManager from "@calcom/lib/EventManager";
import { getUsersCredentialsIncludeServiceAccountKey } from "@calcom/lib/server/getUsersCredentials";
import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import {
  assertValidTimeRange,
  buildAttendeeRows,
  buildUnifiedCalendarEvent,
  getUniqueAttendeeEmails,
  replaceBookingReferences,
  resolveUnifiedTargetDestinationCalendar,
  toDateOrThrow,
} from "./bookingLifecycle.shared";
import type {
  TUnifiedCalendarRescheduleBookingInput,
  TUnifiedCalendarRescheduleBookingOutput,
} from "./rescheduleBooking.schema";

type RescheduleBookingOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TUnifiedCalendarRescheduleBookingInput;
};

export const rescheduleUnifiedCalendarBookingHandler = async ({
  ctx,
  input,
}: RescheduleBookingOptions): Promise<TUnifiedCalendarRescheduleBookingOutput> => {
  const startTime = toDateOrThrow(input.startTime, "startTime");
  const endTime = toDateOrThrow(input.endTime, "endTime");
  assertValidTimeRange(startTime, endTime);

  const existingBooking = await prisma.booking.findFirst({
    where: {
      id: input.bookingId,
      user: {
        id: ctx.user.id,
      },
      status: {
        notIn: [BookingStatus.CANCELLED, BookingStatus.REJECTED],
      },
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

  if (!existingBooking) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Booking not found",
    });
  }

  const destinationCalendar = input.targetCalendar
    ? await resolveUnifiedTargetDestinationCalendar({
        user: ctx.user,
        targetCalendar: input.targetCalendar,
      })
    : existingBooking.destinationCalendar;

  const attendeeEmails = input.attendeeEmails ? getUniqueAttendeeEmails(input.attendeeEmails) : null;
  if (input.attendeeEmails && attendeeEmails.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "At least one attendee email is required when updating attendees",
    });
  }

  const organizerLocale = ctx.user.locale ?? "en";
  const organizerTimeZone = ctx.user.timeZone ?? "UTC";

  const updatedBooking = await prisma.booking.update({
    where: {
      id: existingBooking.id,
    },
    data: {
      title: input.title?.trim() ?? existingBooking.title,
      description: input.note === undefined ? existingBooking.description : input.note?.trim() || null,
      location: input.location === undefined ? existingBooking.location : input.location?.trim() || null,
      startTime,
      endTime,
      rescheduledBy: ctx.user.email,
      destinationCalendar: destinationCalendar
        ? {
            connect: {
              id: destinationCalendar.id,
            },
          }
        : undefined,
      attendees: attendeeEmails
        ? {
            deleteMany: {},
            createMany: {
              data: buildAttendeeRows({
                attendeeEmails,
                locale: organizerLocale,
                timeZone: organizerTimeZone,
              }),
            },
          }
        : undefined,
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

  const credentials = await getUsersCredentialsIncludeServiceAccountKey(ctx.user);
  const eventManager = new EventManager({
    ...ctx.user,
    credentials,
  });

  const calEvent = await buildUnifiedCalendarEvent({
    booking: updatedBooking,
    destinationCalendar: destinationCalendar ?? updatedBooking.destinationCalendar,
    organizer: ctx.user,
    attendees: updatedBooking.attendees,
    conferenceCredentialId: input.locationCredentialId,
  });

  const destinationChanged = Boolean(
    destinationCalendar && destinationCalendar.id !== existingBooking.destinationCalendar?.id
  );

  const eventManagerResult = destinationChanged
    ? await (async () => {
        if (existingBooking.references.length > 0) {
          await eventManager.cancelEvent(calEvent, existingBooking.references);
        }
        return eventManager.create(calEvent);
      })()
    : existingBooking.references.length > 0
    ? await eventManager.reschedule(calEvent, existingBooking.uid)
    : await eventManager.create(calEvent);

  await replaceBookingReferences({
    bookingId: updatedBooking.id,
    references: eventManagerResult.referencesToCreate,
  });

  await triggerBookingEmails({
    calEvent,
    emailType: "rescheduled",
    isHostConfirmationEmailsDisabled: false,
    isAttendeeConfirmationEmailDisabled: false,
    hasRelevantSmsWorkflow: false,
  });

  return {
    bookingId: updatedBooking.id,
    bookingUid: updatedBooking.uid,
  };
};
