import type { NewSeatedBookingObject, SeatedBooking } from "bookings/lib/handleSeats/types";
// eslint-disable-next-line no-restricted-imports
import { cloneDeep } from "lodash";

import EventManager from "@calcom/core/EventManager";
import dayjs from "@calcom/dayjs";
import { sendRescheduledEmails, sendRescheduledSeatEmail } from "@calcom/emails";
import { HttpError } from "@calcom/lib/http-error";
import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";
import type { AdditionalInformation, AppsStatus, Person } from "@calcom/types/Calendar";

import {
  refreshCredentials,
  addVideoCallDataToEvt,
  handleAppsStatus,
  findBookingQuery,
} from "../handleNewBooking";
import type { Booking, createLoggerWithEventDetails } from "../handleNewBooking";

const handleRescheduledSeatedEvent = async (
  seatedEventObject: NewSeatedBookingObject,
  seatedBooking: SeatedBooking,
  loggerWithEventDetails: ReturnType<typeof createLoggerWithEventDetails>
) => {
  const {
    eventType,
    allCredentials,
    organizerUser,
    originalRescheduledBooking,
    bookerEmail,
    tAttendees,
    bookingSeat,
    reqUserId,
    rescheduleReason,
    rescheduleUid,
    reqAppsStatus,
    noEmail,
    isConfirmedByDefault,
    additionalNotes,
    attendeeLanguage,
  } = seatedEventObject;

  let { evt } = seatedEventObject;

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

    // If there is no booking during the new time slot then update the current booking to the new date
    if (!newTimeSlotBooking) {
      const newBooking: (Booking & { appsStatus?: AppsStatus[] }) | null = await prisma.booking.update({
        where: {
          id: seatedBooking.id,
        },
        data: {
          startTime: evt.startTime,
          endTime: evt.endTime,
          cancellationReason: rescheduleReason,
        },
        include: {
          user: true,
          references: true,
          payment: true,
          attendees: true,
        },
      });

      evt = addVideoCallDataToEvt(newBooking.references, evt);

      const copyEvent = cloneDeep(evt);

      const updateManager = await eventManager.reschedule(copyEvent, rescheduleUid, newBooking.id);

      // @NOTE: This code is duplicated and should be moved to a function
      // This gets overridden when updating the event - to check if notes have been hidden or not. We just reset this back
      // to the default description when we are sending the emails.
      evt.description = eventType.description;

      const results = updateManager.results;

      const calendarResult = results.find((result) => result.type.includes("_calendar"));

      evt.iCalUID = calendarResult?.updatedEvent.iCalUID || undefined;

      if (results.length > 0 && results.some((res) => !res.success)) {
        const error = {
          errorCode: "BookingReschedulingMeetingFailed",
          message: "Booking Rescheduling failed",
        };
        loggerWithEventDetails.error(
          `Booking ${organizerUser.name} failed`,
          JSON.stringify({ error, results })
        );
      } else {
        const metadata: AdditionalInformation = {};
        if (results.length) {
          // TODO: Handle created event metadata more elegantly
          const [updatedEvent] = Array.isArray(results[0].updatedEvent)
            ? results[0].updatedEvent
            : [results[0].updatedEvent];
          if (updatedEvent) {
            metadata.hangoutLink = updatedEvent.hangoutLink;
            metadata.conferenceData = updatedEvent.conferenceData;
            metadata.entryPoints = updatedEvent.entryPoints;
            evt.appsStatus = handleAppsStatus(results, newBooking, reqAppsStatus);
          }
        }
      }

      if (noEmail !== true && isConfirmedByDefault) {
        const copyEvent = cloneDeep(evt);
        loggerWithEventDetails.debug("Emails: Sending reschedule emails - handleSeats");
        await sendRescheduledEmails({
          ...copyEvent,
          additionalNotes, // Resets back to the additionalNote input and not the override value
          cancellationReason: `$RCH$${rescheduleReason ? rescheduleReason : ""}`, // Removable code prefix to differentiate cancellation from rescheduling for email
        });
      }
      const foundBooking = await findBookingQuery(newBooking.id);

      resultBooking = { ...foundBooking, appsStatus: newBooking.appsStatus };
    } else {
      // Merge two bookings together
      const attendeesToMove = [],
        attendeesToDelete = [];

      for (const attendee of seatedBooking.attendees) {
        // If the attendee already exists on the new booking then delete the attendee record of the old booking
        if (
          newTimeSlotBooking.attendees.some(
            (newBookingAttendee) => newBookingAttendee.email === attendee.email
          )
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
        attendeesToMove.length +
          newTimeSlotBooking.attendees.filter((attendee) => attendee.bookingSeat).length >
          eventType.seatsPerTimeSlot
      ) {
        throw new HttpError({ statusCode: 409, message: "Booking does not have enough available seats" });
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

      await Promise.all([
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

      evt = addVideoCallDataToEvt(updatedNewBooking.references, evt);

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
        await sendRescheduledEmails({
          ...copyEvent,
          additionalNotes, // Resets back to the additionalNote input and not the override value
          cancellationReason: `$RCH$${rescheduleReason ? rescheduleReason : ""}`, // Removable code prefix to differentiate cancellation from rescheduling for email
        });
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

      resultBooking = { ...foundBooking };
    }
  }

  // seatAttendee is null when the organizer is rescheduling.
  const seatAttendee: Partial<Person> | null = bookingSeat?.attendee || null;
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
};

export default handleRescheduledSeatedEvent;
