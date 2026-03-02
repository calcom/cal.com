import AttendeeCancelledEmail from "@calcom/emails/templates/attendee-cancelled-email";
import { makeUserActor } from "@calcom/features/booking-audit/lib/makeActor";
import type { ActionSource } from "@calcom/features/booking-audit/lib/types/actionSource";
import { getBookingEventHandlerService } from "@calcom/features/bookings/di/BookingEventHandlerService.container";
import { extractBaseEmail } from "@calcom/lib/extract-base-email";
import logger from "@calcom/lib/logger";
import { getTranslation } from "@calcom/i18n/server";
import { prisma } from "@calcom/prisma";
import type { BookingResponses } from "@calcom/prisma/zod-utils";
import { TRPCError } from "@trpc/server";
import {
  type Booking,
  buildCalendarEvent,
  getBooking,
  getOrganizerData,
  prepareAttendeesList,
  type TUser,
  updateCalendarEvent,
  validateUserPermissions,
} from "./bookingAttendees.utils";
import type { TRemoveAttendeeInputSchema } from "./removeAttendee.schema";

type RemoveAttendeeOptions = {
  ctx: {
    user: TUser;
  };
  input: TRemoveAttendeeInputSchema;
  emailsEnabled?: boolean;
  actionSource: ActionSource;
};

export const removeAttendeeHandler = async ({
  ctx,
  input,
  emailsEnabled = true,
  actionSource,
}: RemoveAttendeeOptions) => {
  const { user } = ctx;
  const { bookingId, attendeeId } = input;

  const booking = await getBooking(bookingId);

  await validateUserPermissions(booking, user);

  const attendeeToRemove = booking.attendees.find((attendee) => attendee.id === attendeeId);

  if (!attendeeToRemove) {
    throw new TRPCError({ code: "NOT_FOUND", message: "attendee_not_found" });
  }

  const sortedAttendees = [...booking.attendees].sort((a, b) => a.id - b.id);
  const primaryAttendee = sortedAttendees[0];

  if (primaryAttendee && attendeeToRemove.id === primaryAttendee.id) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "cannot_remove_primary_attendee" });
  }

  const organizer = await getOrganizerData(booking.userId);

  // capture attendee emails BEFORE removal for audit
  const oldAttendeeEmails = booking.attendees.map((a) => a.email);
  const newAttendeeEmails = booking.attendees.filter((a) => a.id !== attendeeId).map((a) => a.email);

  const attendeesList = await prepareAttendeesList(booking.attendees.filter((a) => a.id !== attendeeId));
  const evt = await buildCalendarEvent(booking, organizer, attendeesList);
  const removedAttendeePerson = await prepareAttendeePerson(attendeeToRemove);

  await removeAttendeeFromBooking(bookingId, attendeeId, attendeeToRemove.email, booking);

  await updateCalendarEvent(booking, evt);

  if (emailsEnabled) {
    await sendCancelledEmailToAttendee(evt, removedAttendeePerson);
  }

  const bookingEventHandlerService = getBookingEventHandlerService();
  await bookingEventHandlerService.onAttendeeRemoved({
    bookingUid: booking.uid,
    actor: makeUserActor(user.uuid),
    organizationId: user.organizationId ?? null,
    source: actionSource,
    auditData: {
      attendees: {
        old: oldAttendeeEmails,
        new: newAttendeeEmails,
      },
    },
  });

  return {
    message: "Attendee removed",
    attendee: {
      id: attendeeToRemove.id,
      bookingId: booking.id,
      name: attendeeToRemove.name,
      email: attendeeToRemove.email,
      timeZone: attendeeToRemove.timeZone,
    },
  };
};

async function removeAttendeeFromBooking(
  bookingId: number,
  attendeeId: number,
  attendeeEmail: string,
  booking: Booking
) {
  const bookingResponses = booking.responses as BookingResponses;
  const baseEmailToRemove = extractBaseEmail(attendeeEmail).toLowerCase();

  const updatedGuests = (bookingResponses?.guests || []).filter((guestEmail: string) => {
    return extractBaseEmail(guestEmail).toLowerCase() !== baseEmailToRemove;
  });

  await prisma.$transaction([
    prisma.attendee.delete({
      where: {
        id: attendeeId,
      },
    }),
    prisma.booking.update({
      where: {
        id: bookingId,
      },
      data: {
        responses: {
          ...bookingResponses,
          guests: updatedGuests,
        },
      },
    }),
  ]);
}

async function prepareAttendeePerson(attendee: Booking["attendees"][number]) {
  return {
    name: attendee.name,
    email: attendee.email,
    timeZone: attendee.timeZone,
    language: {
      translate: await getTranslation(attendee.locale ?? "en", "common"),
      locale: attendee.locale ?? "en",
    },
  };
}

async function sendCancelledEmailToAttendee(
  evt: Awaited<ReturnType<typeof buildCalendarEvent>>,
  attendee: Awaited<ReturnType<typeof prepareAttendeePerson>>
): Promise<void> {
  try {
    const email = new AttendeeCancelledEmail(evt, attendee);
    await email.sendEmail();
  } catch (error) {
    logger.error("Failed to send cancellation email to removed attendee", {
      error,
    });
  }
}
