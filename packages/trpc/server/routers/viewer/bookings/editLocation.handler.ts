import type { z } from "zod";

import { getEventLocationType, OrganizerDefaultConferencingAppType } from "@calcom/app-store/locations";
import { getAppFromSlug } from "@calcom/app-store/utils";
import EventManager from "@calcom/core/EventManager";
import dayjs from "@calcom/dayjs";
import { sendLocationChangeEmails } from "@calcom/emails";
import { parseRecurringEvent } from "@calcom/lib";
import { getVideoCallUrlFromCalEvent } from "@calcom/lib/CalEventParser";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { getTranslation } from "@calcom/lib/server";
import { getUsersCredentials } from "@calcom/lib/server/getUsersCredentials";
import { prisma } from "@calcom/prisma";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";
import { userMetadata } from "@calcom/prisma/zod-utils";
import type { EventTypeMetadata } from "@calcom/prisma/zod-utils";
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
type UserMetadata = z.infer<typeof userMetadata>;

/**
 * An error that should be shown to the user
 */
class UserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LocationError";
  }
}

/**
 * An error that should not be shown to the user
 */
class SystemError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SystemError";
  }
}

function getLocationForOrganizerDefaultConferencingAppInEvtFormat({
  organizer,
  translate,
}: {
  organizer: {
    name: string;
    metadata: {
      defaultConferencingApp?: NonNullable<UserMetadata>["defaultConferencingApp"];
    } | null;
  };
  translate: Awaited<ReturnType<typeof getTranslation>>;
}) {
  const organizerMetadata = organizer.metadata;
  const defaultConferencingApp = organizerMetadata?.defaultConferencingApp;
  if (!defaultConferencingApp) {
    throw new UserError(
      translate("organizer_default_conferencing_app_not_found", { organizer: organizer.name })
    );
  }
  const defaultConferencingAppSlug = defaultConferencingApp.appSlug;
  const app = getAppFromSlug(defaultConferencingAppSlug);
  const defaultConferencingAppLocationType = app?.appData?.location?.type;

  if (!defaultConferencingAppLocationType) {
    throw new SystemError("Default conferencing app has no location type");
  }

  const location = defaultConferencingAppLocationType;
  const locationType = getEventLocationType(location);
  if (!locationType) {
    throw new SystemError(`Location type not found: ${location}`);
  }

  if (!locationType.default && locationType.linkType === "dynamic") {
    // Dynamic location type need to return the location as it is e.g. integrations:zoom_video
    return location;
  }

  const appLink = defaultConferencingApp.appLink;
  if (!appLink) {
    throw new SystemError(`Default conferencing app ${defaultConferencingAppSlug} has no app link`);
  }
  return appLink;
}

export const editLocationHandler = async ({ ctx, input }: EditLocationOptions) => {
  const {
    bookingId,
    /**
     * It would be
     * - Address for Organizer Address
     * - Phone Number for Organizer Phone
     * - Meeting Link for Link Meeting Type
     * - {OrganizerDefaultConferencingAppType} for Organizer Default Conferencing App
     */
    newLocation,
    credentialId,
  } = input;
  const { booking, user: loggedInUser } = ctx;

  const organizerFromDb = await prisma.user.findFirstOrThrow({
    where: {
      id: booking.userId || 0,
    },
    select: {
      name: true,
      email: true,
      timeZone: true,
      locale: true,
      metadata: true,
    },
  });

  const organizer = {
    ...organizerFromDb,
    metadata: userMetadata.parse(organizerFromDb.metadata),
  };

  let conferenceCredential: CredentialPayload | null = null;

  if (credentialId) {
    conferenceCredential = await prisma.credential.findFirst({
      where: {
        id: credentialId,
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

  let newLocationInEvtFormat;

  try {
    newLocationInEvtFormat =
      newLocation !== OrganizerDefaultConferencingAppType
        ? newLocation
        : getLocationForOrganizerDefaultConferencingAppInEvtFormat({
            organizer: {
              name: organizer.name ?? "Organizer",
              metadata: organizer.metadata,
            },
            translate: await getTranslation(loggedInUser.locale ?? "en", "common"),
          });
  } catch (e) {
    if (e instanceof UserError) {
      throw new TRPCError({ code: "BAD_REQUEST", message: e.message });
    }
    logger.error(safeStringify(e));
    throw e;
  }

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
    location: newLocationInEvtFormat,
    conferenceCredentialId: credentialId ?? undefined,
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
    throw new SystemError("Updating location failed");
  } else {
    const additionalInformation: AdditionalInformation = {};
    logger.info(`Updating location and references in DB`, safeStringify(results));

    if (results.length) {
      additionalInformation.hangoutLink = results[0].updatedEvent?.hangoutLink;
      additionalInformation.conferenceData = results[0].updatedEvent?.conferenceData;
      additionalInformation.entryPoints = results[0].updatedEvent?.entryPoints;
    }

    const bookingMetadataUpdate = {
      videoCallUrl: getVideoCallUrlFromCalEvent(evt),
    };

    await prisma.booking.update({
      where: {
        id: bookingId,
      },
      data: {
        location: newLocationInEvtFormat,
        metadata: {
          ...(typeof booking.metadata === "object" && booking.metadata),
          ...bookingMetadataUpdate,
        },
        references: {
          create: updatedResult.referencesToCreate,
        },
      },
    });

    try {
      await sendLocationChangeEmails(
        { ...evt, additionalInformation },
        booking?.eventType?.metadata as EventTypeMetadata
      );
    } catch (error) {
      console.log("Error sending LocationChangeEmails", safeStringify(error));
    }
  }
  return { message: "Location updated" };
};
