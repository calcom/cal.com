import dayjs from "@calcom/dayjs";
import EventManager from "@calcom/features/bookings/lib/EventManager";
import { refreshCredentials } from "@calcom/features/bookings/lib/getAllCredentialsForUsersOnEvent/refreshCredentials";
import { PrismaOrgMembershipRepository } from "@calcom/features/membership/repositories/PrismaOrgMembershipRepository";
import { HttpError } from "@calcom/lib/http-error";
import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";
import type { Person } from "@calcom/types/Calendar";
import type { createLoggerWithEventDetails } from "../../handleNewBooking/logger";
import type {
  HandleSeatsResultBooking,
  RescheduleSeatedBookingObject,
  SeatAttendee,
  SeatedBooking,
} from "../types";
import attendeeRescheduleSeatedBooking from "./attendee/attendeeRescheduleSeatedBooking";
import ownerRescheduleSeatedBooking from "./owner/ownerRescheduleSeatedBooking";

const rescheduleSeatedBooking = async (
  // If this function is being called then rescheduleUid is defined
  rescheduleSeatedBookingObject: RescheduleSeatedBookingObject,
  seatedBooking: SeatedBooking,
  resultBooking: HandleSeatsResultBooking | null,
  loggerWithEventDetails: ReturnType<typeof createLoggerWithEventDetails>
) => {
  const { evt, eventType, allCredentials, organizerUser, bookerEmail, tAttendees, bookingSeat, reqUserId } =
    rescheduleSeatedBookingObject;

  const { originalRescheduledBooking } = rescheduleSeatedBookingObject;

  // See if the new date has a booking already
  const newTimeSlotBooking = await prisma.booking.findFirst({
    where: {
      startTime: dayjs(evt.startTime).toDate(),
      eventTypeId: eventType.id,
      status: BookingStatus.ACCEPTED,
    },
    select: {
      id: true,
      uid: true,
      iCalUID: true,
      userId: true,
      attendees: {
        include: {
          bookingSeat: true,
        },
      },
      references: true,
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
    iCalUID: originalRescheduledBooking.iCalUID,
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
    const isOrgAdmin =
      reqUserId &&
      seatedBooking.user &&
      (await PrismaOrgMembershipRepository.isLoggedInUserOrgAdminOfBookingHost(
        reqUserId,
        seatedBooking.user?.id
      ));
    // if no bookingSeat is given and the userId != owner, 401.
    // if no bookingSeat is given, also check if the request user is an org admin of the booking user
    // TODO: Next step; Evaluate ownership, what about teams?
    if (seatedBooking.user?.id !== reqUserId && !isOrgAdmin) {
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
    resultBooking = await attendeeRescheduleSeatedBooking(
      rescheduleSeatedBookingObject,
      seatAttendee,
      newTimeSlotBooking,
      originalBookingEvt,
      eventManager
    );
  }

  return resultBooking;
};

export default rescheduleSeatedBooking;
