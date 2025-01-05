import { getAllCredentials } from "@calcom/features/bookings/lib/getAllCredentialsForUsersOnEvent/getAllCredentials";
import { getBookerUrl } from "@calcom/features/bookings/lib/handleNewBooking/getBookerUrl";
import type { BookingResponses } from "@calcom/features/bookings/lib/handleNewBooking/getBookingData";
import { getEventType } from "@calcom/features/bookings/lib/handleNewBooking/getEventType";
import { getEventNameObject } from "@calcom/features/bookings/lib/handleNewBooking/getEventnameObject";
import { getTranslation } from "@calcom/lib/server";
import prisma from "@calcom/prisma";

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
        },
      },
      attendees: true,
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

  return {
    booking: {
      id: bookingId,
      startTime: booking.startTime,
      endTime: booking.endTime,
      title: booking.title,
      description: booking.description,
      location: booking.location,
    },
    organizerUser,
    tOrganizer,
    eventType,
    allCredentials,
    teamId: eventType?.team?.id,
    bookerUrl,
    eventNameObject,
  };
};

export default generateBookingCreatedParams;
