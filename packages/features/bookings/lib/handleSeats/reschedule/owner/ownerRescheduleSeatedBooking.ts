// eslint-disable-next-line no-restricted-imports
import type EventManager from "@calcom/features/bookings/lib/EventManager";
import type { createLoggerWithEventDetails } from "../../../handleNewBooking/logger";
import type {
  HandleSeatsResultBooking,
  NewTimeSlotBooking,
  RescheduleSeatedBookingObject,
  SeatedBooking,
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
