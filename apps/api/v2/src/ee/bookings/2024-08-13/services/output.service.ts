import { Injectable } from "@nestjs/common";
import { plainToClass } from "class-transformer";
import { DateTime } from "luxon";
import { z } from "zod";

import { BookingOutput_2024_08_13 } from "@calcom/platform-types";
import { Booking } from "@calcom/prisma/client";

export const bookingResponsesSchema = z.object({
  email: z.string(),
  name: z.string(),
  guests: z.array(z.string()).optional(),
});

@Injectable()
export class OutputBookingsService_2024_08_13 {
  getOutputBooking(
    databaseBooking: Booking & {
      attendees: { name: string; email: string; timeZone: string; locale: string | null }[];
    }
  ) {
    const dateStart = DateTime.fromISO(databaseBooking.startTime.toISOString());
    const dateEnd = DateTime.fromISO(databaseBooking.endTime.toISOString());
    const duration = dateEnd.diff(dateStart, "minutes").minutes;

    const bookingResponses = bookingResponsesSchema.parse(databaseBooking.responses);
    const attendee = databaseBooking.attendees.find((attendee) => attendee.email === bookingResponses.email);

    if (!attendee) {
      throw new Error("Attendee not found");
    }

    const booking = {
      id: databaseBooking.id,
      uid: databaseBooking.uid,
      status: databaseBooking.status.toLowerCase(),
      start: databaseBooking.startTime,
      end: databaseBooking.endTime,
      duration,
      eventTypeId: databaseBooking.eventTypeId,
      attendee: {
        name: attendee.name,
        email: attendee.email,
        timeZone: attendee.timeZone,
        language: attendee.locale,
      },
      guests: bookingResponses.guests,
      meetingUrl: databaseBooking.location,
    };

    return plainToClass(BookingOutput_2024_08_13, booking, { strategy: "excludeAll" });
  }
}
