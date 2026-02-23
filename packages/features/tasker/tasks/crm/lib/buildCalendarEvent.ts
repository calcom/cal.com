import { getCalEventResponses } from "@calcom/features/bookings/lib/getCalEventResponses";
import type { BuiltCalendarEvent } from "@calcom/features/CalendarEventBuilder";
import { CalendarEventBuilder } from "@calcom/features/CalendarEventBuilder";
import { getBookerBaseUrl } from "@calcom/features/ee/organizations/lib/getBookerUrlServer";
import { ProfileRepository } from "@calcom/features/profile/repositories/ProfileRepository";
import { getTranslation } from "@calcom/i18n/server";
import prisma from "@calcom/prisma";
import type { CalendarEvent } from "@calcom/types/Calendar";

const buildCalendarEvent: (bookingUid: string) => Promise<CalendarEvent> = async (bookingUid: string) => {
  const booking = await prisma.booking.findUnique({
    where: {
      uid: bookingUid,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          locale: true,
          username: true,
          timeZone: true,
          timeFormat: true,
        },
      },
      eventType: {
        select: {
          slug: true,
          bookingFields: true,
          team: {
            select: {
              parentId: true,
            },
          },
        },
      },
      attendees: {
        select: {
          email: true,
          locale: true,
          name: true,
          timeZone: true,
          phoneNumber: true,
        },
      },
      references: true,
    },
  });

  if (!booking) {
    throw new Error(`booking not found for bookings: ${bookingUid}`);
  }

  if (!booking.user) {
    throw new Error(`organizer not found for booking: ${bookingUid}`);
  }

  if (!booking.eventType) {
    throw new Error(`event type not found for booking ${bookingUid}`);
  }

  const organizerOrganizationId = booking.eventType.team?.parentId
    ? booking.eventType.team.parentId
    : await ProfileRepository.findFirstOrganizationIdForUser({
        userId: booking.userId ?? booking.user.id,
      });
  const bookerUrl = await getBookerBaseUrl(organizerOrganizationId ?? null);
  const organizerT = await getTranslation(booking.user?.locale ?? "en", "common");

  const attendeePromises = [];
  for (const attendee of booking.attendees) {
    attendeePromises.push(
      getTranslation(attendee.locale ?? "en", "common").then((tAttendee) => ({
        email: attendee.email,
        name: attendee.name,
        timeZone: attendee.timeZone,
        language: { translate: tAttendee, locale: attendee.locale ?? "en" },
        phoneNumber: attendee.phoneNumber || undefined,
      }))
    );
  }

  const attendeeList = await Promise.all(attendeePromises);

  let calendarEvent: BuiltCalendarEvent = {
    uid: bookingUid,
    type: booking.eventType.slug,
    title: booking.title,
    startTime: booking.startTime.toISOString(),
    endTime: booking.endTime.toISOString(),
    bookerUrl,
    organizer: {
      email: booking.user.email,
      name: booking.user.name || "Nameless",
      username: booking.user?.username || "No username",
      language: { translate: organizerT, locale: booking.user?.locale ?? "en" },
      timeZone: booking.user.timeZone,
    },
    attendees: attendeeList,
    location: booking.location,
    ...getCalEventResponses({
      bookingFields: booking?.eventType?.bookingFields ?? null,
      booking,
    }),
  };

  calendarEvent = CalendarEventBuilder.fromEvent(calendarEvent)
    .withVideoCallDataFromReferences(booking.references)
    .build();

  return calendarEvent;
};

export default buildCalendarEvent;
