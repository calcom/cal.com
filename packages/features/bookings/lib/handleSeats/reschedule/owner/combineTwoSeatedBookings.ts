 
import { cloneDeep } from "lodash";
import { uuid } from "short-uuid";

import { sendRescheduledEmailsAndSMS } from "@calcom/emails/email-manager";
import type EventManager from "@calcom/features/bookings/lib/EventManager";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { HttpError } from "@calcom/lib/http-error";
import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";

import { addVideoCallDataToEvent } from "../../../handleNewBooking/addVideoCallDataToEvent";
import { findBookingQuery } from "../../../handleNewBooking/findBookingQuery";
import type { createLoggerWithEventDetails } from "../../../handleNewBooking/logger";
import type { SeatedBooking, RescheduleSeatedBookingObject, NewTimeSlotBooking } from "../../types";

const combineTwoSeatedBookings = async (
  rescheduleSeatedBookingObject: RescheduleSeatedBookingObject,
  seatedBooking: SeatedBooking,
  newTimeSlotBooking: NewTimeSlotBooking,
  eventManager: EventManager,
  loggerWithEventDetails: ReturnType<typeof createLoggerWithEventDetails>
) => {
  const {
    eventType,
    tAttendees,
    attendeeLanguage,
    rescheduleUid,
    noEmail,
    isConfirmedByDefault,
    additionalNotes,
    rescheduleReason,
  } = rescheduleSeatedBookingObject;
  let { evt } = rescheduleSeatedBookingObject;
  // Merge two bookings together
  const attendeesToMove = [],
    attendeesToDelete = [];

  for (const attendee of seatedBooking.attendees) {
    // If the attendee already exists on the new booking then delete the attendee record of the old booking
    if (
      newTimeSlotBooking.attendees.some((newBookingAttendee) => newBookingAttendee.email === attendee.email)
    ) {
      attendeesToDelete.push(attendee.id);
      // If the attendee does not exist on the new booking then move that attendee record to the new booking
    } else {
      attendeesToMove.push({ id: attendee.id, seatReferenceId: attendee.bookingSeat?.id });
    }
  }

  // Confirm that the new event will have enough available seats
  if (
    !eventType.seatsPerTimeSlot ||
    attendeesToMove.length + newTimeSlotBooking.attendees.filter((attendee) => attendee.bookingSeat).length >
      eventType.seatsPerTimeSlot
  ) {
    throw new HttpError({ statusCode: 409, message: ErrorCode.NotEnoughAvailableSeats });
  }

  const moveAttendeeCalls = [];
  for (const attendeeToMove of attendeesToMove) {
    moveAttendeeCalls.push(
      prisma.attendee.update({
        where: {
          id: attendeeToMove.id,
        },
        data: {
          bookingId: newTimeSlotBooking.id,
          bookingSeat: {
            upsert: {
              create: {
                referenceUid: uuid(),
                bookingId: newTimeSlotBooking.id,
              },
              update: {
                bookingId: newTimeSlotBooking.id,
              },
            },
          },
        },
      })
    );
  }

  await prisma.$transaction([
    ...moveAttendeeCalls,
    // Delete any attendees that are already a part of that new time slot booking
    prisma.attendee.deleteMany({
      where: {
        id: {
          in: attendeesToDelete,
        },
      },
    }),
  ]);

  const updatedNewBooking = await prisma.booking.findUnique({
    where: {
      id: newTimeSlotBooking.id,
    },
    include: {
      attendees: true,
      references: true,
    },
  });

  if (!updatedNewBooking) {
    throw new HttpError({ statusCode: 404, message: "Updated booking not found" });
  }

  // Update the evt object with the new attendees
  const updatedBookingAttendees = updatedNewBooking.attendees.map((attendee) => {
    const evtAttendee = {
      ...attendee,
      language: { translate: tAttendees, locale: attendeeLanguage ?? "en" },
    };
    return evtAttendee;
  });

  evt.attendees = updatedBookingAttendees;

  evt = { ...addVideoCallDataToEvent(updatedNewBooking.references, evt), bookerUrl: evt.bookerUrl };

  const copyEvent = cloneDeep(evt);

  const updateManager = await eventManager.reschedule(copyEvent, rescheduleUid, newTimeSlotBooking.id);

  const results = updateManager.results;

  const calendarResult = results.find((result) => result.type.includes("_calendar"));

  evt.iCalUID = Array.isArray(calendarResult?.updatedEvent)
    ? calendarResult?.updatedEvent[0]?.iCalUID
    : calendarResult?.updatedEvent?.iCalUID || undefined;

  if (noEmail !== true && isConfirmedByDefault) {
    // TODO send reschedule emails to attendees of the old booking
    loggerWithEventDetails.debug("Emails: Sending reschedule emails - handleSeats");
    await sendRescheduledEmailsAndSMS(
      {
        ...copyEvent,
        additionalNotes, // Resets back to the additionalNote input and not the override value
        cancellationReason: `$RCH$${rescheduleReason ? rescheduleReason : ""}`, // Removable code prefix to differentiate cancellation from rescheduling for email
      },
      eventType.metadata
    );
  }

  // Update the old booking with the cancelled status
  await prisma.booking.update({
    where: {
      id: seatedBooking.id,
    },
    data: {
      status: BookingStatus.CANCELLED,
    },
  });

  const foundBooking = await findBookingQuery(newTimeSlotBooking.id);

  return { ...foundBooking };
};

export default combineTwoSeatedBookings;
