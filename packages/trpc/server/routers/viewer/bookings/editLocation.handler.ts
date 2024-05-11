import EventManager from "@calcom/core/EventManager";
import dayjs from "@calcom/dayjs";
import { sendLocationChangeEmailsAndSMS } from "@calcom/emails";
import { parseRecurringEvent } from "@calcom/lib";
import logger from "@calcom/lib/logger";
import { getTranslation } from "@calcom/lib/server";
import { getUsersCredentials } from "@calcom/lib/server/getUsersCredentials";
import { prisma } from "@calcom/prisma";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";
import type { AdditionalInformation, CalendarEvent } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import type { TEditLocationInputSchema } from "./editLocation.schema";
import type { BookingsProcedureContext } from "./util";

type EditLocationOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  } & BookingsProcedureContext;
  input: TEditLocationInputSchema;
};

export const editLocationHandler = async ({ ctx, input }: EditLocationOptions) => {
  const { bookingId, newLocation: location, details } = input;
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

    let conferenceCredential: CredentialPayload | null = null;

    if (details?.credentialId) {
      conferenceCredential = await prisma.credential.findFirst({
        where: {
          id: details.credentialId,
        },
        select: credentialForCalendarServiceSelect,
      });
    }

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
        email: booking?.userPrimaryEmail ?? organizer.email,
        name: organizer.name ?? "Nameless",
        timeZone: organizer.timeZone,
        language: { translate: tOrganizer, locale: organizer.locale ?? "en" },
      },
      attendees: attendeesList,
      uid: booking.uid,
      recurringEvent: parseRecurringEvent(booking.eventType?.recurringEvent),
      location,
      conferenceCredentialId: details?.credentialId,
      destinationCalendar: booking?.destinationCalendar
        ? [booking?.destinationCalendar]
        : booking?.user?.destinationCalendar
        ? [booking?.user?.destinationCalendar]
        : [],
      seatsPerTimeSlot: booking.eventType?.seatsPerTimeSlot,
      seatsShowAttendees: booking.eventType?.seatsShowAttendees,
    };

    const credentials = await getUsersCredentials(ctx.user);

    const eventManager = new EventManager({
      ...ctx.user,
      credentials: [
        ...(credentials ? credentials : []),
        ...(conferenceCredential ? [conferenceCredential] : []),
      ],
    });

    const updatedResult = await eventManager.updateLocation(evt, booking);
    const results = updatedResult.results;
    if (results.length > 0 && results.every((res) => !res.success)) {
      const error = {
        errorCode: "BookingUpdateLocationFailed",
        message: "Updating location failed",
      };
      logger.error(`Booking ${ctx.user.username} failed`, error, results);
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
        await sendLocationChangeEmailsAndSMS({ ...evt, additionalInformation: metadata });
      } catch (error) {
        console.log("Error sending LocationChangeEmails");
      }
    }
  } catch {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  }
  return { message: "Location updated" };
};
