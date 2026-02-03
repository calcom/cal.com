import type { DestinationCalendar } from "@prisma/client";
import type { Prisma } from "@prisma/client";

import { metadata as GoogleVideoMetadata } from "@calcom/app-store/googlevideo/_metadata";
import { getAllCredentialsIncludeServiceAccountKey } from "@calcom/features/bookings/lib/getAllCredentialsForUsersOnEvent/getAllCredentials";
import type { EventType } from "@calcom/features/bookings/lib/getAllCredentialsForUsersOnEvent/getAllCredentials";
import { getVideoCallDetails } from "@calcom/features/bookings/lib/handleNewBooking/getVideoCallDetails";
import { getVideoCallUrlFromCalEvent } from "@calcom/lib/CalEventParser";
import EventManager from "@calcom/lib/EventManager";
import type { EventManagerUser,  EventManagerInitParams } from "@calcom/lib/EventManager";
import logger from "@calcom/lib/logger";
import { getTranslation } from "@calcom/lib/server/i18n";
import { BookingReferenceRepository } from "@calcom/lib/server/repository/bookingReference";
import { prisma } from "@calcom/prisma";
import type { CalendarEvent } from "@calcom/types/Calendar";

type RoundRobinReschedulingManagerPayload = {
  evt: CalendarEvent;
  rescheduleUid: string;
  newBookingId?: number;
  changedOrganizer?: boolean;
  previousHostDestinationCalendar?: DestinationCalendar[] | null;
  initParams: {
    user: {
      id: number;
      name: string | null;
      email: string;
      username: string | null;
    } & EventManagerUser;
    eventTypeAppMetadata?: EventManagerInitParams["eventTypeAppMetadata"];
    eventType: EventType;
  };
  bookingLocation: string | null;
  bookingId: number;
  bookingICalUID?: string | null;
  bookingMetadata?: Prisma.JsonValue;
};

export const roundRobinReschedulingManager = async (payload: RoundRobinReschedulingManagerPayload) => {
  const {
    evt,
    rescheduleUid,
    newBookingId,
    changedOrganizer,
    previousHostDestinationCalendar,
    initParams,
    bookingLocation,
    bookingId,
    bookingICalUID,
    bookingMetadata,
  } = payload;

  const log = logger.getSubLogger({
    prefix: ["roundRobinReschedulingManager", `${bookingId}`],
  });

  const credentialsWithServiceKey = await getAllCredentialsIncludeServiceAccountKey(
    initParams.user,
    initParams?.eventType
  );

  const eventManagerConfig = {
    ...initParams.user,
    credentials: credentialsWithServiceKey,
  };

  const manager = new EventManager(eventManagerConfig, initParams?.eventTypeAppMetadata);

  const reschedulingOperation = await manager.reschedule(
    evt,
    rescheduleUid,
    newBookingId,
    changedOrganizer,
    previousHostDestinationCalendar
  );

  const operationResults = reschedulingOperation.results ?? [];

  const videoDetails = getVideoCallDetails({ results: operationResults });

  const supplementaryData = videoDetails.metadata;
  let computedVideoUrl = videoDetails.videoCallUrl;

  const hasResults = operationResults.length > 0;

  if (hasResults && bookingLocation === "integrations:google:meet") {
    await processMeetLocation(operationResults, reschedulingOperation, log);
  }

  if (hasResults) {
    const primaryResult = extractPrimaryEventResult(operationResults[0]);

    Object.assign(supplementaryData, {
      hangoutLink: primaryResult?.hangoutLink,
      conferenceData: primaryResult?.conferenceData,
      entryPoints: primaryResult?.entryPoints,
    });

    computedVideoUrl = determineVideoUrl(
      supplementaryData.hangoutLink,
      primaryResult?.url,
      evt,
      computedVideoUrl
    );

    updateEventICalUID(evt, operationResults);
  }

  await persistBookingReferences(bookingId, reschedulingOperation.referencesToCreate);

  const effectiveVideoUrl = resolveEffectiveVideoUrl(bookingLocation, computedVideoUrl, evt);

  await updateBookingRecord(
    bookingId,
    bookingLocation,
    evt.iCalUID,
    bookingICalUID,
    bookingMetadata,
    effectiveVideoUrl,
    evt,
    log
  );

  return {
    evtWithAdditionalInfo: {
      ...evt,
      additionalInformation: supplementaryData,
    },
  };
};

async function processMeetLocation(results: any[], reschedulingOp: any, logInstance: any) {
  const meetBaseConfig = {
    appName: GoogleVideoMetadata.name,
    type: "conferencing" as const,
    uid: results[0].uid,
    originalEvent: results[0].originalEvent,
  };

  const gcalRefPosition = reschedulingOp.referencesToCreate.findIndex(
    (reference: any) => reference.type === "google_calendar"
  );

  const gcalResult = results[gcalRefPosition];

  if (!gcalResult) {
    const t = await getTranslation("en", "common");
    logInstance.warn("Google Calendar not installed but using Google Meet as location");
    results.push({
      ...meetBaseConfig,
      success: false,
      calWarnings: [t("google_meet_warning")],
    });
    return;
  }

  const extractedLink = extractHangoutLink(gcalResult);

  if (extractedLink) {
    results.push({
      ...meetBaseConfig,
      success: true,
    });

    reschedulingOp.referencesToCreate[gcalRefPosition] = {
      ...reschedulingOp.referencesToCreate[gcalRefPosition],
      meetingUrl: extractedLink,
    };

    reschedulingOp.referencesToCreate.push({
      type: "google_meet_video",
      meetingUrl: extractedLink,
      uid: gcalResult.uid,
      credentialId: reschedulingOp.referencesToCreate[gcalRefPosition].credentialId,
    });
  } else {
    results.push({
      ...meetBaseConfig,
      success: false,
    });
  }
}

function extractHangoutLink(calendarResult: any): string | undefined {
  const eventData = Array.isArray(calendarResult?.updatedEvent)
    ? calendarResult.updatedEvent[0]
    : calendarResult?.updatedEvent ?? calendarResult?.createdEvent;

  return eventData?.hangoutLink;
}

function extractPrimaryEventResult(firstResult: any) {
  return Array.isArray(firstResult?.updatedEvent)
    ? firstResult.updatedEvent[0]
    : firstResult?.updatedEvent ?? firstResult?.createdEvent;
}

function determineVideoUrl(
  hangout: string | undefined,
  primaryUrl: string | undefined,
  calEvent: CalendarEvent,
  fallbackUrl: string | undefined
): string | undefined {
  return hangout || primaryUrl || getVideoCallUrlFromCalEvent(calEvent) || fallbackUrl;
}

function updateEventICalUID(calEvent: CalendarEvent, results: any[]) {
  const calendarResult = results.find((r) => r.type.includes("_calendar"));

  if (calendarResult) {
    const icalValue = Array.isArray(calendarResult?.updatedEvent)
      ? calendarResult.updatedEvent[0]?.iCalUID
      : calendarResult?.updatedEvent?.iCalUID;

    if (icalValue) {
      calEvent.iCalUID = icalValue;
    }
  }
}

async function persistBookingReferences(bookingIdentifier: number, references: any[]) {
  const referencesCopy = structuredClone(references);

  await BookingReferenceRepository.replaceBookingReferences({
    bookingId: bookingIdentifier,
    newReferencesToCreate: referencesCopy,
  });
}

function resolveEffectiveVideoUrl(
  location: string | null,
  computedUrl: string | undefined,
  calEvent: CalendarEvent
): string | undefined {
  if (location?.startsWith("http")) {
    return location;
  }

  return computedUrl ? getVideoCallUrlFromCalEvent(calEvent) || computedUrl : undefined;
}

async function updateBookingRecord(
  bookingIdentifier: number,
  location: string | null,
  eventICalUID: string | undefined,
  originalICalUID: string | undefined,
  existingMetadata: Prisma.JsonValue,
  videoUrl: string | undefined,
  calEvent: CalendarEvent,
  logInstance: any
) {
  try {
    const metadataUpdate = videoUrl ? { videoCallUrl: videoUrl } : undefined;

    const iCalUIDToStore = eventICalUID !== originalICalUID ? eventICalUID : originalICalUID;

    const metadataBase = typeof existingMetadata === "object" && existingMetadata ? existingMetadata : {};

    await prisma.booking.update({
      where: { id: bookingIdentifier },
      data: {
        location,
        iCalUID: iCalUIDToStore,
        metadata: { ...metadataBase, ...metadataUpdate },
      },
    });
  } catch (error) {
    logInstance.error("Error while updating booking metadata", JSON.stringify({ error }));
  }
}
