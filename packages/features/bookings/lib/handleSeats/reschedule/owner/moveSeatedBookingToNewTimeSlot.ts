 
import { cloneDeep } from "lodash";

import { sendRescheduledEmailsAndSMS } from "@calcom/emails/email-manager";
import type EventManager from "@calcom/features/bookings/lib/EventManager";
import prisma from "@calcom/prisma";
import type { AdditionalInformation, AppsStatus } from "@calcom/types/Calendar";

import { addVideoCallDataToEvent } from "../../../handleNewBooking/addVideoCallDataToEvent";
import type { Booking } from "../../../handleNewBooking/createBooking";
import { findBookingQuery } from "../../../handleNewBooking/findBookingQuery";
import { handleAppsStatus } from "../../../handleNewBooking/handleAppsStatus";
import type { createLoggerWithEventDetails } from "../../../handleNewBooking/logger";
import type { SeatedBooking, RescheduleSeatedBookingObject } from "../../types";

const moveSeatedBookingToNewTimeSlot = async (
  rescheduleSeatedBookingObject: RescheduleSeatedBookingObject,
  seatedBooking: SeatedBooking,
  eventManager: EventManager,
  loggerWithEventDetails: ReturnType<typeof createLoggerWithEventDetails>
) => {
  const {
    rescheduleReason,
    rescheduleUid,
    eventType,
    organizerUser,
    reqAppsStatus,
    noEmail,
    isConfirmedByDefault,
    additionalNotes,
  } = rescheduleSeatedBookingObject;
  let { evt } = rescheduleSeatedBookingObject;

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

  evt = { ...addVideoCallDataToEvent(newBooking.references, evt), bookerUrl: evt.bookerUrl };

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
    loggerWithEventDetails.error(`Booking ${organizerUser.name} failed`, JSON.stringify({ error, results }));
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
    await sendRescheduledEmailsAndSMS(
      {
        ...copyEvent,
        additionalNotes, // Resets back to the additionalNote input and not the override value
        cancellationReason: `$RCH$${rescheduleReason ? rescheduleReason : ""}`, // Removable code prefix to differentiate cancellation from rescheduling for email
      },
      eventType.metadata
    );
  }
  const foundBooking = await findBookingQuery(newBooking.id);

  return { ...foundBooking, appsStatus: newBooking.appsStatus };
};

export default moveSeatedBookingToNewTimeSlot;
