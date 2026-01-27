import type { DestinationCalendar } from "@prisma/client";
import type { Prisma } from "@prisma/client";

import { metadata as GoogleMeetMetadata } from "@calcom/app-store/googlevideo/_metadata";
import { MeetLocationType } from "@calcom/app-store/locations";
import { getAllCredentialsIncludeServiceAccountKey } from "@calcom/features/bookings/lib/getAllCredentialsForUsersOnEvent/getAllCredentials";
import type { EventType } from "@calcom/features/bookings/lib/getAllCredentialsForUsersOnEvent/getAllCredentials";
import { getVideoCallDetails } from "@calcom/features/bookings/lib/handleNewBooking/getVideoCallDetails";
import { getVideoCallUrlFromCalEvent } from "@calcom/lib/CalEventParser";
import EventManager from "@calcom/lib/EventManager";
import type { EventManagerInitParams } from "@calcom/lib/EventManager";
import logger from "@calcom/lib/logger";
import { getTranslation } from "@calcom/lib/server/i18n";
import { BookingReferenceRepository } from "@calcom/lib/server/repository/bookingReference";
import { prisma } from "@calcom/prisma";
import type { CalendarEvent, AdditionalInformation } from "@calcom/types/Calendar";

type InitParams = {
  user: {
    id: number;
    name: string | null;
    email: string;
    username: string | null;
  } & EventManagerInitParams["user"];
  eventTypeAppMetadata?: EventManagerInitParams["eventTypeAppMetadata"];
  eventType: EventType;
};

export const roundRobinReschedulingManager = async ({
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
}: {
  evt: CalendarEvent;
  rescheduleUid: string;
  newBookingId?: number;
  changedOrganizer?: boolean;
  previousHostDestinationCalendar?: DestinationCalendar[] | null;
  initParams: InitParams;
  bookingLocation: string | null;
  bookingId: number;
  bookingICalUID?: string | null;
  bookingMetadata?: Prisma.JsonValue;
}) => {
  const loggerInstance = logger.getSubLogger({
    prefix: ["handleRescheduleEventManager", `${bookingId}`],
  });

  const userCredentials = await getAllCredentialsIncludeServiceAccountKey(
    initParams.user,
    initParams?.eventType
  );

  const managerInstance = new EventManager(
    { ...initParams.user, credentials: userCredentials },
    initParams?.eventTypeAppMetadata
  );

  const rescheduleManager = await managerInstance.reschedule(
    evt,
    rescheduleUid,
    newBookingId,
    changedOrganizer,
    previousHostDestinationCalendar
  );

  const rescheduleResults = rescheduleManager.results ?? [];

  const { metadata: extractedVideoMetadata, videoCallUrl: extractedVideoUrl } = getVideoCallDetails({
    results: rescheduleResults,
  });

  let finalVideoUrl = extractedVideoUrl;
  let additionalInfo: AdditionalInformation = {};
  additionalInfo = extractedVideoMetadata;

  if (rescheduleResults.length) {
    if (bookingLocation === MeetLocationType) {
      const meetResultObject = {
        appName: GoogleMeetMetadata.name,
        type: "conferencing",
        uid: rescheduleResults[0].uid,
        originalEvent: rescheduleResults[0].originalEvent,
      };

      const calendarRefIndex = rescheduleManager.referencesToCreate.findIndex(
        (ref) => ref.type === "google_calendar"
      );
      const calendarProviderResult = rescheduleResults[calendarRefIndex];

      const translator = await getTranslation("en", "common");

      if (!calendarProviderResult) {
        loggerInstance.warn("Google Calendar not installed but using Google Meet as location");
        rescheduleResults.push({
          ...meetResultObject,
          success: false,
          calWarnings: [translator("google_meet_warning")],
        });
      }

      const meetingLink = Array.isArray(calendarProviderResult?.updatedEvent)
        ? calendarProviderResult.updatedEvent[0]?.hangoutLink
        : calendarProviderResult?.updatedEvent?.hangoutLink ?? calendarProviderResult?.createdEvent?.hangoutLink;

      if (meetingLink) {
        rescheduleResults.push({
          ...meetResultObject,
          success: true,
        });

        rescheduleManager.referencesToCreate[calendarRefIndex] = {
          ...rescheduleManager.referencesToCreate[calendarRefIndex],
          meetingUrl: meetingLink,
        };

        rescheduleManager.referencesToCreate.push({
          type: "google_meet_video",
          meetingUrl: meetingLink,
          uid: calendarProviderResult.uid,
          credentialId: rescheduleManager.referencesToCreate[calendarRefIndex].credentialId,
        });
      } else if (calendarProviderResult && !meetingLink) {
        rescheduleResults.push({
          ...meetResultObject,
          success: false,
        });
      }
    }
    
    const primaryEventResult = Array.isArray(rescheduleResults[0]?.updatedEvent)
      ? rescheduleResults[0]?.updatedEvent[0]
      : rescheduleResults[0]?.updatedEvent ?? rescheduleResults[0]?.createdEvent;
    
    additionalInfo.hangoutLink = primaryEventResult?.hangoutLink;
    additionalInfo.conferenceData = primaryEventResult?.conferenceData;
    additionalInfo.entryPoints = primaryEventResult?.entryPoints;

    finalVideoUrl =
      additionalInfo.hangoutLink || primaryEventResult?.url || getVideoCallUrlFromCalEvent(evt) || finalVideoUrl;

    const calendarEventResult = rescheduleResults.find((result) => result.type.includes("_calendar"));

    evt.iCalUID = Array.isArray(calendarEventResult?.updatedEvent)
      ? calendarEventResult?.updatedEvent[0]?.iCalUID
      : calendarEventResult?.updatedEvent?.iCalUID || undefined;
  }
  
  const clonedReferences = structuredClone(rescheduleManager.referencesToCreate);

  await BookingReferenceRepository.replaceBookingReferences({
    bookingId,
    newReferencesToCreate: clonedReferences,
  });

  try {
    if (bookingLocation?.startsWith("http")) {
      finalVideoUrl = bookingLocation;
    }

    const updatedMetadata = finalVideoUrl
      ? {
          videoCallUrl: getVideoCallUrlFromCalEvent(evt) || finalVideoUrl,
        }
      : undefined;

    await prisma.booking.update({
      where: {
        id: bookingId,
      },
      data: {
        location: bookingLocation,
        iCalUID: evt.iCalUID !== bookingICalUID ? evt.iCalUID : bookingICalUID,
        metadata: { ...(typeof bookingMetadata === "object" && bookingMetadata), ...updatedMetadata },
      },
    });
  } catch (err) {
    loggerInstance.error("Error while updating booking metadata", JSON.stringify({ error: err }));
  }

  const enrichedEvent = {
    ...evt,
    additionalInformation: additionalInfo,
  };

  return { evtWithAdditionalInfo: enrichedEvent };
};