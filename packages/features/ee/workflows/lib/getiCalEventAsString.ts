import dayjs from "@calcom/dayjs";
import { parseRecurringEvent } from "@calcom/lib/isRecurringEvent";
import type { Prisma, User } from "@calcom/prisma/client";
import type { DateArray } from "ics";
import { createEvent } from "ics";
import { RRule } from "rrule";
import { v4 as uuidv4 } from "uuid";

type Booking = Prisma.BookingGetPayload<{
  include: {
    eventType: true;
    attendees: true;
  };
}>;

export function getiCalEventAsString(
  booking: Pick<Booking, "startTime" | "endTime" | "description" | "location" | "attendees"> & {
    eventType: { recurringEvent?: Prisma.JsonValue; title?: string } | null;
    user: Partial<User> | null;
  }
) {
  let recurrenceRule: string | undefined;
  const recurringEvent = parseRecurringEvent(booking.eventType?.recurringEvent);
  if (recurringEvent?.count) {
    recurrenceRule = new RRule(recurringEvent).toString().replace("RRULE:", "");
  }

  const uid = uuidv4();

  const icsEvent = createEvent({
    uid,
    startInputType: "utc",
    start: dayjs(booking.startTime.toISOString() || "")
      .utc()
      .toArray()
      .slice(0, 6)
      .map((v, i) => (i === 1 ? v + 1 : v)) as DateArray,
    duration: {
      minutes: dayjs(booking.endTime.toISOString() || "").diff(
        dayjs(booking.startTime.toISOString() || ""),
        "minute"
      ),
    },
    title: booking.eventType?.title || "",
    description: booking.description || "",
    location: booking.location || "",
    organizer: {
      email: booking.user?.email || "",
      name: booking.user?.name || "",
    },
    attendees: [
      {
        name: booking.attendees[0].name,
        email: booking.attendees[0].email,
        partstat: "ACCEPTED",
        role: "REQ-PARTICIPANT",
        rsvp: true,
      },
    ],
    method: "REQUEST",
    ...{ recurrenceRule },
    status: "CONFIRMED",
  });

  if (icsEvent.error) {
    throw icsEvent.error;
  }

  return icsEvent.value;
}
