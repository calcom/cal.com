import dayjs from "@calcom/dayjs";
import { sendAddGuestsEmails } from "@calcom/emails";
import { parseRecurringEvent } from "@calcom/lib";
import { getTranslation } from "@calcom/lib/server";
import { prisma } from "@calcom/prisma";
import type { CalendarEvent } from "@calcom/types/Calendar";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import type { TAddGuestsInputSchema } from "./addGuests.schema";
import type { BookingsProcedureContext } from "./util";

type AddGuestsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  } & BookingsProcedureContext;
  input: TAddGuestsInputSchema;
};
export const addGuestsHandler = async ({ ctx, input }: AddGuestsOptions) => {
  const { bookingId, guests } = input;
  const { booking } = ctx;

  try {
    const organizer = await prisma.user.findFirstOrThrow({
      where: {
        id: booking.userId || 0,
      },
      select: {
        name: true,
        email: true,
        timeZone: true,
        locale: true,
      },
    });

    const currentGuests = await prisma.booking.findFirstOrThrow({
      where: {
        id: bookingId,
      },
      select: {
        attendees: true,
      },
    });

    const uniqueGuests = guests.filter(
      (guest) => !currentGuests.attendees.some((attendee) => guest === attendee.email)
    );

    const guestsFullDetails = uniqueGuests.map((guest) => {
      return {
        name: "",
        email: guest,
        timeZone: organizer.timeZone,
        locale: organizer.locale,
      };
    });

    const bookingAttendees = await prisma.booking.update({
      where: {
        id: bookingId,
      },
      include: {
        attendees: true,
      },
      data: {
        attendees: {
          createMany: {
            data: guestsFullDetails,
          },
        },
      },
    });

    const attendeesListPromises = bookingAttendees.attendees.map(async (attendee) => {
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
    const tOrganizer = await getTranslation(organizer.locale ?? "en", "common");

    const evt: CalendarEvent = {
      title: booking.title || "",
      type: (booking.eventType?.title as string) || booking?.title || "",
      description: booking.description || "",
      startTime: booking.startTime ? dayjs(booking.startTime).format() : "",
      endTime: booking.endTime ? dayjs(booking.endTime).format() : "",
      organizer: {
        email: booking?.userPrimaryEmail ?? organizer.email,
        name: organizer.name ?? "Nameless",
        timeZone: organizer.timeZone,
        language: { translate: tOrganizer, locale: organizer.locale ?? "en" },
      },
      attendees: attendeesList,
      uid: booking.uid,
      recurringEvent: parseRecurringEvent(booking.eventType?.recurringEvent),
      location: booking.location,
      destinationCalendar: booking?.destinationCalendar
        ? [booking?.destinationCalendar]
        : booking?.user?.destinationCalendar
        ? [booking?.user?.destinationCalendar]
        : [],
      seatsPerTimeSlot: booking.eventType?.seatsPerTimeSlot,
      seatsShowAttendees: booking.eventType?.seatsShowAttendees,
    };
    try {
      await sendAddGuestsEmails(evt);
    } catch (err) {
      console.log("Error sending AddGuestsEmails");
    }
  } catch (err) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  }
  return { message: "Guests added" };
};
