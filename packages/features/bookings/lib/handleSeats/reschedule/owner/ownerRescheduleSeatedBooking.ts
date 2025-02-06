// eslint-disable-next-line no-restricted-imports
import type EventManager from "@calcom/core/EventManager";
import { getBusyTimes } from "@calcom/core/getBusyTimes";
import dayjs from "@calcom/dayjs";
import prisma from "@calcom/prisma";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";

import type { createLoggerWithEventDetails } from "../../../handleNewBooking";
import type {
  NewTimeSlotBooking,
  SeatedBooking,
  RescheduleSeatedBookingObject,
  HandleSeatsResultBooking,
} from "../../types";
import combineTwoSeatedBookings from "./combineTwoSeatedBookings";
import moveSeatedBookingToNewTimeSlot from "./moveSeatedBookingToNewTimeSlot";

const ownerRescheduleSeatedBooking = async (
  rescheduleSeatedBookingObject: RescheduleSeatedBookingObject,
  newTimeSlotBooking: NewTimeSlotBooking | null,
  seatedBooking: SeatedBooking,
  resultBooking: HandleSeatsResultBooking | null,
  eventManager: EventManager,
  loggerWithEventDetails: ReturnType<typeof createLoggerWithEventDetails>
) => {
  const { originalRescheduledBooking, tAttendees } = rescheduleSeatedBookingObject;
  const { evt } = rescheduleSeatedBookingObject;

  evt.attendees =
    originalRescheduledBooking?.attendees.map((attendee) => {
      return {
        name: attendee.name,
        email: attendee.email,
        timeZone: attendee.timeZone,
        language: { translate: tAttendees, locale: attendee.locale ?? "en" },
      };
    }) ?? [];

  // Check booker availability if they already use Cal dot com
  if (originalRescheduledBooking?.attendees.length) {
    const bookerEmail = originalRescheduledBooking.attendees[0].email;
    const bookerUser = await prisma.user.findUnique({
      where: { email: bookerEmail },
      select: {
        id: true,
        credentials: {
          select: {
            ...credentialForCalendarServiceSelect,
            user: { select: { email: true } },
          },
        },
        selectedCalendars: true,
        timeZone: true,
      },
    });

    if (bookerUser) {
      const startTime = dayjs(evt.startTime);
      const endTime = dayjs(evt.endTime);

      // Get booker's busy times for the new slot
      const busyTimes = await getBusyTimes({
        credentials: bookerUser.credentials,
        selectedCalendars: bookerUser.selectedCalendars,
        userId: bookerUser.id,
        userEmail: bookerEmail,
        username: bookerEmail.split("@")[0],
        bypassBusyCalendarTimes: false,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      // Check if the new time slot conflicts with booker's availability
      const hasConflict = busyTimes.some((busy) => {
        const busyStart = dayjs(busy.start);
        const busyEnd = dayjs(busy.end);
        return (
          startTime.isBetween(busyStart, busyEnd, null, "[]") ||
          endTime.isBetween(busyStart, busyEnd, null, "[]") ||
          (startTime.isBefore(busyStart) && endTime.isAfter(busyEnd))
        );
      });

      if (hasConflict) {
        throw new Error("Selected time conflicts with attendee's existing commitments");
      }
    }
  }

  // If there is no booking during the new time slot then update the current booking to the new date
  if (!newTimeSlotBooking) {
    resultBooking = await moveSeatedBookingToNewTimeSlot(
      rescheduleSeatedBookingObject,
      seatedBooking,
      eventManager,
      loggerWithEventDetails
    );
  } else {
    // If a booking already exists during the new time slot then merge the two bookings together
    resultBooking = await combineTwoSeatedBookings(
      rescheduleSeatedBookingObject,
      seatedBooking,
      newTimeSlotBooking,
      eventManager,
      loggerWithEventDetails
    );
  }
  return resultBooking;
};

export default ownerRescheduleSeatedBooking;
