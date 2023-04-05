import type prismaType from "@prisma/client";
import type {
  Attendee,
  Booking,
  BookingReference,
  DestinationCalendar,
  EventType,
  User,
} from "@prisma/client";
import type z from "zod";

import EventManager from "@calcom/core/EventManager";
import dayjs from "@calcom/dayjs";
import { sendLocationChangeEmails } from "@calcom/emails";
import { parseRecurringEvent } from "@calcom/lib";
import logger from "@calcom/lib/logger";
import { getTranslation } from "@calcom/lib/server";
import type { AdditionalInformation, CalendarEvent } from "@calcom/types/Calendar";
import type { Optional } from "@calcom/types/utils";

import { TRPCError } from "@trpc/server";

import type { TRPCContext } from "../../../createContext";
import type { editLocationSchema } from "./schemas/editLocationSchema";

// TODO: infer context from bookingsProcedure
interface BookingsResolverOpts {
  ctx: Optional<TRPCContext, "req" | "res"> & {
    booking: Booking & {
      eventType: EventType | null;
      destinationCalendar: DestinationCalendar | null;
      user:
        | (User & {
            destinationCalendar: DestinationCalendar | null;
            credentials: Credential[];
          } & { id: string })
        | null;
      references: BookingReference[];
      attendees: Attendee[];
    };
  } & { user: NonNullable<TRPCContext["user"]> };
  prisma: prismaType;
  booking: Booking & {
    eventType: EventType | null;
    destinationCalendar: DestinationCalendar | null;
    user:
      | (User & {
          destinationCalendar: DestinationCalendar | null;
          credentials: Credential[];
        })
      | null;
    references: BookingReference[];
    attendees: Attendee[];
  };
  user: NonNullable<TRPCContext["user"]>;
  input: z.infer<typeof editLocationSchema>;
}
export const editLocation = async ({ prisma, booking, user, input }: BookingsResolverOpts) => {
  const { bookingId, newLocation: location } = input;
  //const { booking } = ctx;

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
    const tOrganizer = await getTranslation(organizer.locale ?? "en", "common");

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

    const evt: CalendarEvent = {
      title: booking.title || "",
      type: (booking.eventType?.title as string) || booking?.title || "",
      description: booking.description || "",
      startTime: booking.startTime ? dayjs(booking.startTime).format() : "",
      endTime: booking.endTime ? dayjs(booking.endTime).format() : "",
      organizer: {
        email: organizer.email,
        name: organizer.name ?? "Nameless",
        timeZone: organizer.timeZone,
        language: { translate: tOrganizer, locale: organizer.locale ?? "en" },
      },
      attendees: attendeesList,
      uid: booking.uid,
      recurringEvent: parseRecurringEvent(booking.eventType?.recurringEvent),
      location,
      destinationCalendar: booking?.destinationCalendar || booking?.user?.destinationCalendar,
    };

    const eventManager = new EventManager(user);

    const updatedResult = await eventManager.updateLocation(evt, booking);
    const results = updatedResult.results;
    if (results.length > 0 && results.every((res) => !res.success)) {
      const error = {
        errorCode: "BookingUpdateLocationFailed",
        message: "Updating location failed",
      };
      logger.error(`Booking ${user.username} failed`, error, results);
    } else {
      await prisma.booking.update({
        where: {
          id: bookingId,
        },
        data: {
          location,
          references: {
            create: updatedResult.referencesToCreate,
          },
        },
      });

      const metadata: AdditionalInformation = {};
      if (results.length) {
        metadata.hangoutLink = results[0].updatedEvent?.hangoutLink;
        metadata.conferenceData = results[0].updatedEvent?.conferenceData;
        metadata.entryPoints = results[0].updatedEvent?.entryPoints;
      }
      try {
        await sendLocationChangeEmails({ ...evt, additionalInformation: metadata });
      } catch (error) {
        console.log("Error sending LocationChangeEmails");
      }
    }
  } catch {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  }
  return { message: "Location updated" };
};
