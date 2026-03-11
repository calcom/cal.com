import { triggerBookingEmails } from "@calcom/features/bookings/lib/handleNewBooking/triggerBookingEmails";
import EventManager from "@calcom/lib/EventManager";
import { getUsersCredentialsIncludeServiceAccountKey } from "@calcom/lib/server/getUsersCredentials";
import prisma from "@calcom/prisma";
import { BookingStatus, CreationSource } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import {
  assertValidTimeRange,
  buildAttendeeRows,
  buildUnifiedCalendarEvent,
  generateUnifiedBookingUid,
  getUniqueAttendeeEmails,
  replaceBookingReferences,
  resolveUnifiedTargetDestinationCalendar,
  toDateOrThrow,
} from "./bookingLifecycle.shared";
import type {
  TUnifiedCalendarCreateBookingInput,
  TUnifiedCalendarCreateBookingOutput,
} from "./createBooking.schema";

type CreateBookingOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TUnifiedCalendarCreateBookingInput;
};

export const createUnifiedCalendarBookingHandler = async ({
  ctx,
  input,
}: CreateBookingOptions): Promise<TUnifiedCalendarCreateBookingOutput> => {
  const startTime = toDateOrThrow(input.startTime, "startTime");
  const endTime = toDateOrThrow(input.endTime, "endTime");
  assertValidTimeRange(startTime, endTime);

  const attendeeEmails = getUniqueAttendeeEmails(input.attendeeEmails);
  if (attendeeEmails.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "At least one attendee email is required",
    });
  }

  const destinationCalendar = await resolveUnifiedTargetDestinationCalendar({
    user: ctx.user,
    targetCalendar: input.targetCalendar,
  });

  const organizerLocale = ctx.user.locale ?? "en";
  const organizerTimeZone = ctx.user.timeZone ?? "UTC";
  const title = input.title.trim();
  const uid = generateUnifiedBookingUid({
    organizerEmail: ctx.user.email,
    startTime,
    title,
  });

  const booking = await prisma.booking.create({
    data: {
      uid,
      user: {
        connect: {
          id: ctx.user.id,
        },
      },
      userPrimaryEmail: ctx.user.email,
      title,
      description: input.note?.trim() || null,
      startTime,
      endTime,
      status: BookingStatus.ACCEPTED,
      location: input.location?.trim() || null,
      iCalUID: uid,
      destinationCalendar: {
        connect: {
          id: destinationCalendar.id,
        },
      },
      attendees: {
        createMany: {
          data: buildAttendeeRows({
            attendeeEmails,
            locale: organizerLocale,
            timeZone: organizerTimeZone,
          }),
        },
      },
      creationSource: CreationSource.WEBAPP,
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
    },
  });

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
    conferenceCredentialId: input.locationCredentialId,
  });

  try {
    const eventManagerResult = await eventManager.create(calEvent);
    await replaceBookingReferences({
      bookingId: booking.id,
      references: eventManagerResult.referencesToCreate,
    });
  } catch (error) {
    await prisma.booking.delete({
      where: {
        id: booking.id,
      },
    });

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create booking on the selected calendar",
      cause: error,
    });
  }

  await triggerBookingEmails({
    calEvent,
    emailType: "scheduled",
    isHostConfirmationEmailsDisabled: false,
    isAttendeeConfirmationEmailDisabled: false,
    hasRelevantSmsWorkflow: false,
    curAttendee: calEvent.attendees[0],
  });

  return {
    bookingId: booking.id,
    bookingUid: booking.uid,
  };
};
