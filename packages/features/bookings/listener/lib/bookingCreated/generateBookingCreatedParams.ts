import { getLocationValueForDB } from "@calcom/app-store/locations";
import type { LocationObject } from "@calcom/app-store/locations";
import { getEventName } from "@calcom/core/event";
import { getAllCredentials } from "@calcom/features/bookings/lib/getAllCredentialsForUsersOnEvent/getAllCredentials";
import { getCalEventResponses } from "@calcom/features/bookings/lib/getCalEventResponses";
import { getBookerUrl } from "@calcom/features/bookings/lib/handleNewBooking/getBookerUrl";
import type { BookingResponses } from "@calcom/features/bookings/lib/handleNewBooking/getBookingData";
import { getEventType } from "@calcom/features/bookings/lib/handleNewBooking/getEventType";
import { getEventNameObject } from "@calcom/features/bookings/lib/handleNewBooking/getEventnameObject";
import { isPrismaObjOrUndefined } from "@calcom/lib";
import { getTranslation } from "@calcom/lib/server";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
import prisma from "@calcom/prisma";
import { bookingMetadataSchema } from "@calcom/prisma/zod-utils";
import type { CalendarEvent } from "@calcom/types/Calendar";

import type { BookingListenerCreateInput } from "../../types";

const generateBookingCreatedParams: (params: {
  bookingId: number;
}) => Promise<BookingListenerCreateInput> = async ({ bookingId }: { bookingId: number }) => {
  const booking = await prisma.booking.findFirst({
    where: {
      id: bookingId,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          destinationCalendar: true,
          username: true,
          locale: true,
          name: true,
          timeZone: true,
          timeFormat: true,
          metadata: true,
          credentials: {
            include: {
              user: {
                select: {
                  email: true,
                },
              },
            },
          },
        },
      },
      eventType: {
        select: {
          slug: true,
          bookingFields: true,
          locations: true,
          hideCalendarNotes: true,
          hideCalendarEventDetails: true,
          schedulingType: true,
          destinationCalendar: true,
        },
      },
      attendees: true,
      destinationCalendar: true,
    },
  });

  const eventType = await getEventType({
    eventTypeId: booking?.eventTypeId ?? 0,
    eventTypeSlug: booking?.eventType?.slug || booking?.dynamicEventSlugRef || "dynamic",
  });

  if (!booking) {
    throw new Error(`Booking not found for bookingId ${bookingId}`);
  }

  if (!booking.user) {
    throw new Error(`User not found for bookingId ${bookingId}`);
  }

  const tOrganizer = await getTranslation(booking.user?.locale ?? "en", "common");

  const organizerUser = booking.user;

  const allCredentials = await getAllCredentials(organizerUser, eventType);

  const profile = await prisma.profile.findFirst({
    where: {
      userId: organizerUser.id,
    },
    select: {
      organizationId: true,
    },
  });

  const bookerUrl = await getBookerUrl({
    eventTypeTeam: eventType.team,
    organizerOrganizationId: profile?.organizationId,
  });

  const eventNameObject = getEventNameObject({
    attendeeName: booking.attendees[0].name,
    eventType,
    eventName: booking.title,
    // TODO: Figure out how to get the number based on attendees not including guests
    numberOfUsers: booking.attendees.length,
    organizerName: organizerUser.name || "Nameless",
    location: booking.location ?? "",
    tOrganizer,
    bookingFields: booking.responses as BookingResponses,
  });

  const eventName = getEventName(eventNameObject);

  const attendeesListPromises = booking.attendees.map(async (attendee) => {
    return {
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

  const { conferenceCredentialId } = getLocationValueForDB(
    booking.location ?? "",
    (booking.eventType?.locations as LocationObject[]) || []
  );

  const destinationCalendar =
    booking?.destinationCalendar ??
    booking?.eventType?.destinationCalendar ??
    booking?.user?.destinationCalendar;

  const bookingMetadata = bookingMetadataSchema.parse(booking?.metadata || {});

  const evt: CalendarEvent = {
    bookerUrl,
    type: eventType.slug,
    title: eventName,
    description: eventType.description,
    additionalNotes: booking.description,
    customInputs: isPrismaObjOrUndefined(booking.customInputs),
    startTime: booking.startTime.toISOString(),
    endTime: booking.endTime.toISOString(),
    organizer: {
      id: organizerUser.id,
      name: organizerUser.name ?? "Nameless",
      email: organizerUser.email,
      username: organizerUser.username || undefined,
      timeZone: organizerUser.timeZone,
      language: { translate: tOrganizer, locale: organizerUser.locale ?? "en" },
      timeFormat: getTimeFormatStringFromUserTimeFormat(organizerUser.timeFormat),
    },
    ...getCalEventResponses({
      bookingFields: booking.eventType?.bookingFields ?? null,
      booking,
    }),
    attendees: attendeesList,
    location: booking.location,
    conferenceCredentialId,
    destinationCalendar: destinationCalendar ? [destinationCalendar] : [],
    hideCalendarNotes: eventType.hideCalendarNotes,
    hideCalendarEventDetails: eventType.hideCalendarEventDetails,
    eventTypeId: eventType.id,
    schedulingType: eventType.schedulingType,
    iCalUID: booking.iCalUID,
    iCalSequence: booking.iCalSequence,
  };

  return {
    booking: {
      id: bookingId,
      startTime: booking.startTime,
      endTime: booking.endTime,
      title: booking.title,
      description: booking.description,
      location: booking.location,
      appsStatus: bookingMetadata?.reqAppsStatus,
      iCalUID: booking.iCalUID,
      customInputs: booking.customInputs,
      metadata: booking.metadata,
    },
    organizerUser,
    tOrganizer,
    eventType,
    allCredentials,
    teamId: eventType?.team?.id,
    bookerUrl,
    eventNameObject,
    evt,
  };
};

export default generateBookingCreatedParams;
