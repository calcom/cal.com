// eslint-disable-next-line no-restricted-imports
import { cloneDeep } from "lodash";

import type EventManager from "@calcom/core/EventManager";
import { sendRescheduledSeatEmail } from "@calcom/emails";
import { getTranslation } from "@calcom/lib/server/i18n";
import prisma from "@calcom/prisma";
import type { Person, CalendarEvent } from "@calcom/types/Calendar";

import { findBookingQuery } from "../../../handleNewBooking/findBookingQuery";
import lastAttendeeDeleteBooking from "../../lib/lastAttendeeDeleteBooking";
import type { RescheduleSeatedBookingObject, SeatAttendee, NewTimeSlotBooking } from "../../types";

const attendeeRescheduleSeatedBooking = async (
  rescheduleSeatedBookingObject: RescheduleSeatedBookingObject,
  seatAttendee: SeatAttendee,
  newTimeSlotBooking: NewTimeSlotBooking | null,
  originalBookingEvt: CalendarEvent,
  eventManager: EventManager
) => {
  const { tAttendees, bookingSeat, bookerEmail, evt } = rescheduleSeatedBookingObject;
  let { originalRescheduledBooking } = rescheduleSeatedBookingObject;

  seatAttendee["language"] = { translate: tAttendees, locale: bookingSeat?.attendee.locale ?? "en" };

  // Update the original calendar event by removing the attendee that is rescheduling
  if (originalBookingEvt && originalRescheduledBooking) {
    // Event would probably be deleted so we first check than instead of updating references
    const filteredAttendees = originalRescheduledBooking?.attendees.filter((attendee) => {
      return attendee.email !== bookerEmail;
    });
    const deletedReference = await lastAttendeeDeleteBooking(
      originalRescheduledBooking,
      filteredAttendees,
      originalBookingEvt
    );

    if (!deletedReference) {
      await eventManager.updateCalendarAttendees(originalBookingEvt, originalRescheduledBooking);
    }
  }

  // If there is no booking then remove the attendee from the old booking and create a new one
  if (!newTimeSlotBooking) {
    await prisma.attendee.delete({
      where: {
        id: seatAttendee?.id,
      },
    });

    // We don't want to trigger rescheduling logic of the original booking
    originalRescheduledBooking = null;

    return null;
  }

  // Need to change the new seat reference and attendee record to remove it from the old booking and add it to the new booking
  // https://stackoverflow.com/questions/4980963/database-insert-new-rows-or-update-existing-ones
  if (seatAttendee?.id && bookingSeat?.id) {
    await prisma.$transaction([
      prisma.attendee.update({
        where: {
          id: seatAttendee.id,
        },
        data: {
          bookingId: newTimeSlotBooking.id,
        },
      }),
      prisma.bookingSeat.update({
        where: {
          id: bookingSeat.id,
        },
        data: {
          bookingId: newTimeSlotBooking.id,
        },
      }),
    ]);
  }

  // Add the new attendees to the new time slot booking attendees
  for (const attendee of newTimeSlotBooking.attendees) {
    const language = await getTranslation(attendee.locale ?? "en", "common");
    evt.attendees.push({
      email: attendee.email,
      name: attendee.name,
      language,
    });
  }

  const copyEvent = cloneDeep({ ...evt, iCalUID: newTimeSlotBooking.iCalUID });

  await eventManager.updateCalendarAttendees(copyEvent, newTimeSlotBooking);

  await sendRescheduledSeatEmail(copyEvent, seatAttendee as Person);
  const filteredAttendees = originalRescheduledBooking?.attendees.filter((attendee) => {
    return attendee.email !== bookerEmail;
  });
  await lastAttendeeDeleteBooking(originalRescheduledBooking, filteredAttendees, originalBookingEvt);

  const foundBooking = await findBookingQuery(newTimeSlotBooking.id);

  return { ...foundBooking, seatReferenceUid: bookingSeat?.referenceUid };
};

export default attendeeRescheduleSeatedBooking;
