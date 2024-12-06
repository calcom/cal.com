import type { z } from "zod";

import { getEventLocationType, OrganizerDefaultConferencingAppType } from "@calcom/app-store/locations";
import { getAppFromSlug } from "@calcom/app-store/utils";
import EventManager from "@calcom/core/EventManager";
import { sendLocationChangeEmailsAndSMS } from "@calcom/emails";
import { getVideoCallUrlFromCalEvent } from "@calcom/lib/CalEventParser";
import { buildCalEventFromBooking } from "@calcom/lib/buildCalEventFromBooking";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { getTranslation } from "@calcom/lib/server";
import { getUsersCredentials } from "@calcom/lib/server/getUsersCredentials";
import { CredentialRepository } from "@calcom/lib/server/repository/credential";
import { UserRepository } from "@calcom/lib/server/repository/user";
import { prisma } from "@calcom/prisma";
import type { Prisma, Booking, BookingReference } from "@calcom/prisma/client";
import type { userMetadata } from "@calcom/prisma/zod-utils";
import type { EventTypeMetadata } from "@calcom/prisma/zod-utils";
import type { AdditionalInformation, CalendarEvent } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { Ensure } from "@calcom/types/utils";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import type { TEditLocationInputSchema } from "./editLocation.schema";
import type { BookingsProcedureContext } from "./util";

// #region EditLocation Types and Helpers
type EditLocationOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  } & BookingsProcedureContext;
  input: TEditLocationInputSchema;
};

type UserMetadata = z.infer<typeof userMetadata>;

async function updateLocationInConnectedAppForBooking({
  evt,
  eventManager,
  booking,
}: {
  evt: CalendarEvent;
  eventManager: EventManager;
  booking: Booking & {
    references: BookingReference[];
  };
}) {
  const updatedResult = await eventManager.updateLocation(evt, booking);
  const results = updatedResult.results;
  if (results.length > 0 && results.every((res) => !res.success)) {
    const error = {
      errorCode: "BookingUpdateLocationFailed",
      message: "Updating location failed",
    };
    logger.error(`Updating location failed`, safeStringify(error), safeStringify(results));
    throw new SystemError("Updating location failed");
  }
  logger.info(`Got results from updateLocationInConnectedApp`, safeStringify(updatedResult.results));
  return updatedResult;
}

function extractAdditionalInformation(result: {
  updatedEvent: AdditionalInformation;
}): AdditionalInformation {
  const additionalInformation: AdditionalInformation = {};
  if (result) {
    additionalInformation.hangoutLink = result.updatedEvent?.hangoutLink;
    additionalInformation.conferenceData = result.updatedEvent?.conferenceData;
    additionalInformation.entryPoints = result.updatedEvent?.entryPoints;
  }
  return additionalInformation;
}

async function updateBookingLocationInDb({
  booking,
  evt,
  referencesToCreate,
}: {
  booking: {
    id: number;
    metadata: Booking["metadata"];
    responses: Booking["responses"];
  };
  evt: Ensure<CalendarEvent, "location">;
  referencesToCreate: Prisma.BookingReferenceCreateInput[];
}) {
  const bookingMetadataUpdate = {
    videoCallUrl: getVideoCallUrlFromCalEvent(evt),
  };

  await prisma.booking.update({
    where: {
      id: booking.id,
    },
    data: {
      location: evt.location,
      metadata: {
        ...(typeof booking.metadata === "object" && booking.metadata),
        ...bookingMetadataUpdate,
      },
      references: {
        create: referencesToCreate,
      },
      responses: {
        ...(typeof booking.responses === "object" && booking.responses),
        location: {
          value: evt.location,
          optionValue: "",
        },
      },
    },
  });
}

async function getAllCredentials({
  user,
  conferenceCredentialId,
}: {
  user: { id: number };
  conferenceCredentialId: number | null;
}) {
  const credentials = await getUsersCredentials(user);

  let conferenceCredential: CredentialPayload | null = null;

  if (conferenceCredentialId) {
    conferenceCredential = await CredentialRepository.findFirstByIdWithKeyAndUser({
      id: conferenceCredentialId,
    });
  }
  return [...(credentials ? credentials : []), ...(conferenceCredential ? [conferenceCredential] : [])];
}

async function getLocationInEvtFormatOrThrow({
  location,
  organizer,
  loggedInUserTranslate,
}: {
  location: string;
  organizer: {
    name: string | null;
    metadata: UserMetadata;
  };
  loggedInUserTranslate: Awaited<ReturnType<typeof getTranslation>>;
}) {
  if (location !== OrganizerDefaultConferencingAppType) {
    return location;
  }

  try {
    return getLocationForOrganizerDefaultConferencingAppInEvtFormat({
      organizer: {
        name: organizer.name ?? "Organizer",
        metadata: organizer.metadata,
      },
      loggedInUserTranslate,
    });
  } catch (e) {
    if (e instanceof UserError) {
      throw new TRPCError({ code: "BAD_REQUEST", message: e.message });
    }
    logger.error(safeStringify(e));
    throw e;
  }
}
// #endregion

/**
 * An error that should be shown to the user
 */
export class UserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LocationError";
  }
}

/**
 * An error that should not be shown to the user
 */
export class SystemError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SystemError";
  }
}

export function getLocationForOrganizerDefaultConferencingAppInEvtFormat({
  organizer,
  loggedInUserTranslate: translate,
}: {
  organizer: {
    name: string;
    metadata: {
      defaultConferencingApp?: NonNullable<UserMetadata>["defaultConferencingApp"];
    } | null;
  };
  /**
   * translate is used to translate if any error is thrown
   */
  loggedInUserTranslate: Awaited<ReturnType<typeof getTranslation>>;
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
  if (!app) {
    throw new SystemError(`Default conferencing app ${defaultConferencingAppSlug} not found`);
  }
  const defaultConferencingAppLocationType = app.appData?.location?.type;
  if (!defaultConferencingAppLocationType) {
    throw new SystemError("Default conferencing app has no location type");
  }

  const location = defaultConferencingAppLocationType;
  const locationType = getEventLocationType(location);
  if (!locationType) {
    throw new SystemError(`Location type not found: ${location}`);
  }

  if (locationType.linkType === "dynamic") {
    // Dynamic location type need to return the location as it is e.g. integrations:zoom_video
    return location;
  }

  const appLink = defaultConferencingApp.appLink;
  if (!appLink) {
    throw new SystemError(`Default conferencing app ${defaultConferencingAppSlug} has no app link`);
  }
  return appLink;
}

export async function editLocationHandler({ ctx, input }: EditLocationOptions) {
  const { newLocation, credentialId: conferenceCredentialId } = input;
  const { booking, user: loggedInUser } = ctx;

  const organizer = await UserRepository.findByIdOrThrow({ id: booking.userId || 0 });

  const newLocationInEvtFormat = await getLocationInEvtFormatOrThrow({
    location: newLocation,
    organizer,
    loggedInUserTranslate: await getTranslation(loggedInUser.locale ?? "en", "common"),
  });

  const evt = await buildCalEventFromBooking({
    booking,
    organizer,
    location: newLocationInEvtFormat,
    conferenceCredentialId,
  });

  const eventManager = new EventManager({
    ...ctx.user,
    credentials: await getAllCredentials({ user: ctx.user, conferenceCredentialId }),
  });

  const updatedResult = await updateLocationInConnectedAppForBooking({
    booking,
    eventManager,
    evt,
  });

  const additionalInformation = extractAdditionalInformation(updatedResult.results[0]);

  await updateBookingLocationInDb({
    booking,
    evt: { ...evt, additionalInformation },
    referencesToCreate: updatedResult.referencesToCreate,
  });

  try {
    await sendLocationChangeEmailsAndSMS(
      { ...evt, additionalInformation },
      booking?.eventType?.metadata as EventTypeMetadata
    );
  } catch (error) {
    console.log("Error sending LocationChangeEmails", safeStringify(error));
  }

  return { message: "Location updated" };
}
