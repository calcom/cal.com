import type {
  HandleSeatsResultBooking,
  SeatedBooking,
  RescheduleSeatedBookingObject,
  SeatAttendee,
} from "bookings/lib/handleSeats/types";
// eslint-disable-next-line no-restricted-imports
import { cloneDeep } from "lodash";

import EventManager from "@calcom/core/EventManager";
import dayjs from "@calcom/dayjs";
import { sendRescheduledSeatEmail } from "@calcom/emails";
import { HttpError } from "@calcom/lib/http-error";
import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";
import type { Person } from "@calcom/types/Calendar";

import { refreshCredentials, findBookingQuery } from "../../handleNewBooking";
import type { createLoggerWithEventDetails } from "../../handleNewBooking";
import lastAttendeeDeleteBooking from "../lib/lastAttendeeDeleteBooking";
import ownerRescheduleSeatedBooking from "./owner/ownerRescheduleSeatedBooking";

const handleRescheduledSeatedEvent = async (
  // If this function is being called then rescheduleUid is defined
  rescheduleSeatedBookingObject: RescheduleSeatedBookingObject,
  seatedBooking: SeatedBooking,
  resultBooking: HandleSeatsResultBooking | null,
  loggerWithEventDetails: ReturnType<typeof createLoggerWithEventDetails>
) => {
  const {
    evt,
    eventType,
    allCredentials,
    organizerUser,
    bookerEmail,
    tAttendees,
    bookingSeat,
    reqUserId,
    rescheduleUid,
  } = rescheduleSeatedBookingObject;

  let { originalRescheduledBooking } = rescheduleSeatedBookingObject;

  // See if the new date has a booking already
  const newTimeSlotBooking = await prisma.booking.findFirst({
    where: {
      startTime: evt.startTime,
      eventTypeId: eventType.id,
      status: BookingStatus.ACCEPTED,
    },
    select: {
      id: true,
      uid: true,
      attendees: {
        include: {
          bookingSeat: true,
        },
      },
    },
  });

  const credentials = await refreshCredentials(allCredentials);
  const eventManager = new EventManager({ ...organizerUser, credentials });

  if (!originalRescheduledBooking) {
    // typescript isn't smart enough;
    throw new Error("Internal Error.");
  }

  const updatedBookingAttendees = originalRescheduledBooking.attendees.reduce(
    (filteredAttendees, attendee) => {
      if (attendee.email === bookerEmail) {
        return filteredAttendees; // skip current booker, as we know the language already.
      }
      filteredAttendees.push({
        name: attendee.name,
        email: attendee.email,
        timeZone: attendee.timeZone,
        language: { translate: tAttendees, locale: attendee.locale ?? "en" },
      });
      return filteredAttendees;
    },
    [] as Person[]
  );

  // If original booking has video reference we need to add the videoCallData to the new evt
  const videoReference = originalRescheduledBooking.references.find((reference) =>
    reference.type.includes("_video")
  );

  const originalBookingEvt = {
    ...evt,
    title: originalRescheduledBooking.title,
    startTime: dayjs(originalRescheduledBooking.startTime).utc().format(),
    endTime: dayjs(originalRescheduledBooking.endTime).utc().format(),
    attendees: updatedBookingAttendees,
    // If the location is a video integration then include the videoCallData
    ...(videoReference && {
      videoCallData: {
        type: videoReference.type,
        id: videoReference.meetingId,
        password: videoReference.meetingPassword,
        url: videoReference.meetingUrl,
      },
    }),
  };

  if (!bookingSeat) {
    // if no bookingSeat is given and the userId != owner, 401.
    // TODO: Next step; Evaluate ownership, what about teams?
    if (seatedBooking.user?.id !== reqUserId) {
      throw new HttpError({ statusCode: 401 });
    }

    // Moving forward in this block is the owner making changes to the booking. All attendees should be affected
    evt.attendees = originalRescheduledBooking.attendees.map((attendee) => {
      return {
        name: attendee.name,
        email: attendee.email,
        timeZone: attendee.timeZone,
        language: { translate: tAttendees, locale: attendee.locale ?? "en" },
      };
    });

    // If owner reschedules the event we want to update the entire booking
    // Also if owner is rescheduling there should be no bookingSeat
    resultBooking = await ownerRescheduleSeatedBooking(
      rescheduleSeatedBookingObject,
      newTimeSlotBooking,
      seatedBooking,
      resultBooking,
      eventManager,
      loggerWithEventDetails
    );
  }

  // seatAttendee is null when the organizer is rescheduling.
  const seatAttendee: SeatAttendee | null = bookingSeat?.attendee || null;
  if (seatAttendee) {
    seatAttendee["language"] = { translate: tAttendees, locale: bookingSeat?.attendee.locale ?? "en" };

    // If there is no booking then remove the attendee from the old booking and create a new one
    if (!newTimeSlotBooking) {
      await prisma.attendee.delete({
        where: {
          id: seatAttendee?.id,
        },
      });

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

      // We don't want to trigger rescheduling logic of the original booking
      originalRescheduledBooking = null;

      return null;
    }

    // Need to change the new seat reference and attendee record to remove it from the old booking and add it to the new booking
    // https://stackoverflow.com/questions/4980963/database-insert-new-rows-or-update-existing-ones
    if (seatAttendee?.id && bookingSeat?.id) {
      await Promise.all([
        await prisma.attendee.update({
          where: {
            id: seatAttendee.id,
          },
          data: {
            bookingId: newTimeSlotBooking.id,
          },
        }),
        await prisma.bookingSeat.update({
          where: {
            id: bookingSeat.id,
          },
          data: {
            bookingId: newTimeSlotBooking.id,
          },
        }),
      ]);
    }

    const copyEvent = cloneDeep(evt);

    const updateManager = await eventManager.reschedule(copyEvent, rescheduleUid, newTimeSlotBooking.id);

    const results = updateManager.results;

    const calendarResult = results.find((result) => result.type.includes("_calendar"));

    evt.iCalUID = Array.isArray(calendarResult?.updatedEvent)
      ? calendarResult?.updatedEvent[0]?.iCalUID
      : calendarResult?.updatedEvent?.iCalUID || undefined;

    await sendRescheduledSeatEmail(copyEvent, seatAttendee as Person);
    const filteredAttendees = originalRescheduledBooking?.attendees.filter((attendee) => {
      return attendee.email !== bookerEmail;
    });
    await lastAttendeeDeleteBooking(originalRescheduledBooking, filteredAttendees, originalBookingEvt);

    const foundBooking = await findBookingQuery(newTimeSlotBooking.id);

    resultBooking = { ...foundBooking, seatReferenceUid: bookingSeat?.referenceUid };
  }

  return resultBooking;
};

export default handleRescheduledSeatedEvent;
