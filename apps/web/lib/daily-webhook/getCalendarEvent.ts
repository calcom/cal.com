import { getTranslation } from "@calcom/lib/server/i18n";
import type { CalendarEvent } from "@calcom/types/Calendar";

import type { getBookingResponse } from "./getBooking";

export const getCalendarEvent = async (booking: getBookingResponse) => {
  const t = await getTranslation(booking?.user?.locale ?? "en", "common");

  const attendeesListPromises = booking.attendees.map(async (attendee) => {
    return {
      id: attendee.id,
      name: attendee.name,
      email: attendee.email,
      timeZone: attendee.timeZone,
      language: {
        translate: await getTranslation(attendee.locale ?? "en", "common"),
        locale: attendee.locale ?? "en",
      },
    };
  });

  const attendeesList = await Promise.all(attendeesListPromises);
  const evt: CalendarEvent = {
    type: booking.title,
    title: booking.title,
    description: booking.description || undefined,
    startTime: booking.startTime.toISOString(),
    endTime: booking.endTime.toISOString(),
    organizer: {
      email: booking?.userPrimaryEmail || booking.user?.email || "Email-less",
      name: booking.user?.name || "Nameless",
      timeZone: booking.user?.timeZone || "Europe/London",
      language: { translate: t, locale: booking?.user?.locale ?? "en" },
    },
    attendees: attendeesList,
    uid: booking.uid,
    customReplyToEmail: booking.eventType?.customReplyToEmail,
  };

  return Promise.resolve(evt);
};
