import { workflowSelect } from "@calcom/ee/workflows/lib/getAllWorkflows";
import { getCalEventResponses } from "@calcom/features/bookings/lib/getCalEventResponses";
import { isPrismaObjOrUndefined, parseRecurringEvent } from "@calcom/lib";
import { HttpError as HttpCode } from "@calcom/lib/http-error";
import { getTranslation } from "@calcom/lib/server/i18n";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
import { bookingMinimalSelect, prisma } from "@calcom/prisma";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";
import type { CalendarEvent } from "@calcom/types/Calendar";

import { getBookerBaseUrl } from "../getBookerUrl/server";

async function getEventType(id: number) {
  return prisma.eventType.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      recurringEvent: true,
      requiresConfirmation: true,
      metadata: true,
    },
  });
}
export async function getBooking(bookingId: number) {
  const booking = await prisma.booking.findUnique({
    where: {
      id: bookingId,
    },
    select: {
      ...bookingMinimalSelect,
      responses: true,
      eventType: {
        select: {
          currency: true,
          description: true,
          id: true,
          length: true,
          price: true,
          requiresConfirmation: true,
          metadata: true,
          title: true,
          teamId: true,
          parentId: true,
          parent: {
            select: {
              teamId: true,
            },
          },
          slug: true,
          workflows: {
            select: {
              workflow: {
                select: workflowSelect,
              },
            },
          },
          bookingFields: true,
          team: {
            select: {
              parentId: true,
            },
          },
        },
      },
      metadata: true,
      smsReminderNumber: true,
      location: true,
      eventTypeId: true,
      userId: true,
      uid: true,
      paid: true,
      destinationCalendar: true,
      status: true,
      user: {
        select: {
          id: true,
          username: true,
          timeZone: true,
          credentials: { select: credentialForCalendarServiceSelect },
          timeFormat: true,
          email: true,
          name: true,
          locale: true,
          destinationCalendar: true,
        },
      },
    },
  });

  if (!booking) throw new HttpCode({ statusCode: 204, message: "No booking found" });

  type EventTypeRaw = Awaited<ReturnType<typeof getEventType>>;
  let eventTypeRaw: EventTypeRaw | null = null;
  if (booking.eventTypeId) {
    eventTypeRaw = await getEventType(booking.eventTypeId);
  }

  const eventType = { ...eventTypeRaw, metadata: EventTypeMetaDataSchema.parse(eventTypeRaw?.metadata) };

  const { user } = booking;

  if (!user) throw new HttpCode({ statusCode: 204, message: "No user found" });

  const t = await getTranslation(user.locale ?? "en", "common");
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

  const organizerOrganizationProfile = await prisma.profile.findFirst({
    where: {
      userId: booking.userId ?? undefined,
    },
  });

  const organizerOrganizationId = organizerOrganizationProfile?.organizationId;

  const bookerUrl = await getBookerBaseUrl(
    booking.eventType?.team?.parentId ?? organizerOrganizationId ?? null
  );

  const attendeesList = await Promise.all(attendeesListPromises);
  const selectedDestinationCalendar = booking.destinationCalendar || user.destinationCalendar;
  const evt: CalendarEvent = {
    type: booking?.eventType?.slug as string,
    title: booking.title,
    bookerUrl,
    description: booking.description || undefined,
    startTime: booking.startTime.toISOString(),
    endTime: booking.endTime.toISOString(),
    customInputs: isPrismaObjOrUndefined(booking.customInputs),
    ...getCalEventResponses({
      booking: booking,
      bookingFields: booking.eventType?.bookingFields || null,
    }),
    organizer: {
      email: booking?.userPrimaryEmail ?? user.email,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      name: user.name!,
      timeZone: user.timeZone,
      timeFormat: getTimeFormatStringFromUserTimeFormat(user.timeFormat),
      language: { translate: t, locale: user.locale ?? "en" },
      id: user.id,
    },
    attendees: attendeesList,
    location: booking.location,
    uid: booking.uid,
    destinationCalendar: selectedDestinationCalendar ? [selectedDestinationCalendar] : [],
    recurringEvent: parseRecurringEvent(eventType?.recurringEvent),
  };

  return {
    booking,
    user,
    evt,
    eventType,
  };
}
