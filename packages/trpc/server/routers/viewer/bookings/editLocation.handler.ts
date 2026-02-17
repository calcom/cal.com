import { getUsersCredentialsIncludeServiceAccountKey } from "@calcom/app-store/delegationCredential";
import { getEventLocationType, OrganizerDefaultConferencingAppType } from "@calcom/app-store/locations";
import { getAppFromSlug } from "@calcom/app-store/utils";
import { sendLocationChangeEmailsAndSMS } from "@calcom/emails/email-manager";
import { makeUserActor } from "@calcom/features/booking-audit/lib/makeActor";
import type { ValidActionSource } from "@calcom/features/booking-audit/lib/types/actionSource";
import { getBookingEventHandlerService } from "@calcom/features/bookings/di/BookingEventHandlerService.container";
import { getFeaturesRepository } from "@calcom/features/di/containers/FeaturesRepository";
import EventManager from "@calcom/features/bookings/lib/EventManager";
import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { CredentialRepository } from "@calcom/features/credentials/repositories/CredentialRepository";
import { CredentialAccessService } from "@calcom/features/credentials/services/CredentialAccessService";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { buildCalEventFromBooking } from "@calcom/lib/buildCalEventFromBooking";
import { getVideoCallUrlFromCalEvent } from "@calcom/lib/CalEventParser";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { getTranslation } from "@calcom/lib/server/i18n";
import { prisma } from "@calcom/prisma";
import type { Booking, BookingReference, EventType } from "@calcom/prisma/client";
import type { EventTypeMetadata, userMetadata } from "@calcom/prisma/zod-utils";
import type { AdditionalInformation, CalendarEvent, Person } from "@calcom/types/Calendar";
import type { PartialReference } from "@calcom/types/EventManager";
import type { Ensure } from "@calcom/types/utils";
import { TRPCError } from "@trpc/server";
import type { z } from "zod";
import type { WebhookTriggerEvents } from "@calcom/prisma/enums";

import type { TrpcSessionUser } from "../../../types";
import type { TEditLocationInputSchema } from "./editLocation.schema";
import type { BookingsProcedureContext } from "./util";
import { getTeamIdFromEventType } from "@calcom/lib/getTeamIdFromEventType";
import getOrgIdFromMemberOrTeamId from "@calcom/lib/getOrgIdFromMemberOrTeamId";
import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import sendPayload from "@calcom/features/webhooks/lib/sendPayload";
import { BookingWebhookFactory } from "@calcom/lib/server/service/BookingWebhookFactory";
import dayjs from "@calcom/dayjs";
import { getCalEventResponses } from "@calcom/features/bookings/lib/getCalEventResponses";
import { CalendarEventBuilder } from "@calcom/lib/builders/CalendarEvent/builder";
import { PersonAttendeeCommonFields } from "~/server/routers/viewer/bookings/types";
import type { TFunction } from "i18next";

// #region EditLocation Types and Helpers
type EditLocationOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  } & BookingsProcedureContext;
  input: TEditLocationInputSchema;
  actionSource: ValidActionSource;
};

type UserMetadata = z.infer<typeof userMetadata>;
const log = logger.getSubLogger({ prefix: ["requestRescheduleHandler"] });

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
  references,
}: {
  booking: {
    id: number;
    metadata: Booking["metadata"];
    responses: Booking["responses"];
  };
  evt: Ensure<CalendarEvent, "location">;
  references: PartialReference[];
}) {
  const isSeatedEvent = !!evt.seatsPerTimeSlot;
  const bookingMetadataUpdate = {
    videoCallUrl: getVideoCallUrlFromCalEvent(evt),
  };
  const referencesToCreate = references.map((reference) => {
    const { credentialId, ...restReference } = reference;
    return {
      ...restReference,
      ...(credentialId && credentialId > 0 ? { credentialId } : {}),
    };
  });
  const responses = {
    ...(typeof booking.responses === "object" && booking.responses),
    location: {
      value: evt.location,
      optionValue: "",
    },
  };

  const bookingRepository = new BookingRepository(prisma);
  await bookingRepository.updateLocationById({
    where: { id: booking.id },
    data: {
      location: evt.location,
      metadata: {
        ...(typeof booking.metadata === "object" && booking.metadata),
        ...bookingMetadataUpdate,
      },
      referencesToCreate,
      ...(!isSeatedEvent ? { responses } : {}),
      iCalSequence: (evt.iCalSequence || 0) + 1,
    },
  });
  return { updatedLocation: evt.location };
}

async function getAllCredentialsIncludeServiceAccountKey({
  user,
  conferenceCredentialId,
  bookingOwnerId,
}: {
  user: { id: number; email: string };
  conferenceCredentialId: number | null;
  bookingOwnerId: number | null;
}) {
  const credentials = await getUsersCredentialsIncludeServiceAccountKey(user);

  let conferenceCredential:
    | Awaited<ReturnType<typeof CredentialRepository.findFirstByIdWithKeyAndUser>>
    | undefined;

  if (conferenceCredentialId) {
    // Validate that the credential is accessible before fetching it
    const credentialAccessService = new CredentialAccessService();
    await credentialAccessService.ensureAccessible({
      credentialId: conferenceCredentialId,
      loggedInUserId: user.id,
      bookingOwnerId,
    });

    // Now fetch the credential with the key
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

export async function editLocationHandler({ ctx, input, actionSource }: EditLocationOptions) {
  const { newLocation, credentialId: conferenceCredentialId } = input;
  const { booking, user: loggedInUser } = ctx;

  const oldLocation = booking.location;

  const organizer = await new UserRepository(prisma).findByIdOrThrow({ id: booking.userId || 0 });
  const organizationId = booking.user?.profiles?.[0]?.organizationId ?? null;

  const bookingRepository = new BookingRepository(prisma);
  const bookingToRelocate = await bookingRepository.findByUidIncludeEventTypeAndReferences({ bookingUid: booking.uid });

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
    organizationId,
  });

  const eventManager = new EventManager({
    ...ctx.user,
    credentials: await getAllCredentialsIncludeServiceAccountKey({
      user: ctx.user,
      conferenceCredentialId,
      bookingOwnerId: booking.userId,
    }),
  });

  const updatedResult = await updateLocationInConnectedAppForBooking({
    booking,
    eventManager,
    evt,
  });

  const additionalInformation = extractAdditionalInformation(updatedResult.results[0]);

  const { updatedLocation } = await updateBookingLocationInDb({
    booking,
    evt: { ...evt, additionalInformation },
    references: updatedResult.referencesToCreate,
  });

  try {
    await sendLocationChangeEmailsAndSMS(
      { ...evt, additionalInformation },
      booking?.eventType?.metadata as EventTypeMetadata
    );
  } catch (error) {
    logger.error("Error sending LocationChangeEmails", safeStringify(error));
  }

  const bookingEventHandlerService = getBookingEventHandlerService();
  const featuresRepository = getFeaturesRepository();
  const isBookingAuditEnabled = organizationId
    ? await featuresRepository.checkIfTeamHasFeature(organizationId, "booking-audit")
    : false;

  await bookingEventHandlerService.onLocationChanged({
    bookingUid: booking.uid,
    actor: makeUserActor(loggedInUser.uuid),
    organizationId,
    source: actionSource,
    auditData: {
      location: {
        old: oldLocation,
        new: updatedLocation,
      },
    },
    isBookingAuditEnabled,
  });

  try {
    const [mainAttendee] = booking.attendees;
    const tAttendees = await getTranslation(mainAttendee.locale ?? "en", "common");
      const usersToPeopleType = (users: PersonAttendeeCommonFields[], selectedLanguage: TFunction): Person[] => {
        return users?.map((user) => {
          return {
            id: user.id,
            email: user.email || "",
            name: user.name || "",
            username: user?.username || "",
            language: { translate: selectedLanguage, locale: user.locale || "en" },
            timeZone: user?.timeZone,
            phoneNumber: user.phoneNumber,
          };
        });
      };

      const userTranslation = await getTranslation(loggedInUser.locale ?? "en", "common");
      const [userAsPeopleType] = usersToPeopleType([loggedInUser], userTranslation);
      const organizer = {
        ...userAsPeopleType,
        email: booking.userPrimaryEmail ?? userAsPeopleType.email,
      };
      const calEventResponses = getCalEventResponses({
          booking,
          bookingFields: booking.eventType?.bookingFields ?? null,
        });
    
      const builder = new CalendarEventBuilder();
      const webhookFactory = new BookingWebhookFactory();
      const event: Partial<EventType> = booking?.eventType ?? {};
      const payload = webhookFactory.createRelocateEventPayload({
        bookingId: booking.id,
        title: booking.title,
        eventSlug: event?.slug ?? null,
        description: booking.description,
        customInputs: booking.customInputs,
        responses: calEventResponses.responses,
        userFieldsResponses: calEventResponses.userFieldsResponses,
        startTime: booking.startTime ? dayjs(booking.startTime).format() : "",
        endTime: booking.endTime ? dayjs(booking.endTime).format() : "",
        organizer,
        attendees: usersToPeopleType(
          // username field doesn't exists on attendee but could be in the future
          booking.attendees as unknown as PersonAttendeeCommonFields[],
          tAttendees
        ),
        uid: booking.uid,
        destinationCalendar: booking.destinationCalendar,
        iCalUID: booking.iCalUID,
        ...(booking.smsReminderNumber && {
          smsReminderNumber: booking.smsReminderNumber,
        }),
        eventTypeId: booking.eventTypeId,
        length: booking.eventType?.length ?? null,
        iCalSequence: builder.calendarEvent.iCalSequence,
        eventTitle: booking.eventType?.title ?? null,
        location: booking.location, // old location
        updatedLocation,
        cancellationReason: null,
        cancelledBy: null,
      });
      const eventTrigger: WebhookTriggerEvents = "BOOKING_LOCATION_UPDATED";

      const teamId = await getTeamIdFromEventType({
        eventType: {
          team: { id: bookingToRelocate.eventType?.teamId ?? null },
          parentId: bookingToRelocate.eventType?.parentId ?? null,
    },
  });

      const triggerForUser = !teamId || (teamId && bookingToRelocate.eventType?.parentId);
      const userId = triggerForUser ? bookingToRelocate.userId : null;
      const orgId = await getOrgIdFromMemberOrTeamId({ memberId: userId, teamId });

      const subscriberOptions = {
        userId,
        eventTypeId: bookingToRelocate.eventTypeId as number,
        triggerEvent: eventTrigger,
        teamId: teamId ? [teamId] : null,
        orgId,
      };
      const webhooks = await getWebhooks(subscriberOptions);

      const promises = webhooks.map((webhook) =>
        sendPayload(webhook.secret, eventTrigger, new Date().toISOString(), webhook, payload).catch((e) => {
          log.error(
            `Error executing webhook for event: ${eventTrigger}, URL: ${webhook.subscriberUrl}, bookingId: ${payload.bookingId}, bookingUid: ${payload.uid}`,
            safeStringify(e)
          );
        })
      );
      await Promise.all(promises);
  } catch (error) {
    logger.error("Error triggering BOOKING_LOCATION_UPDATED webhook", safeStringify(error));
  }

  return { message: "Location updated" };
}
