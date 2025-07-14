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

export const handleRescheduleEventManager = async ({
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
  const handleRescheduleEventManager = logger.getSubLogger({
    prefix: ["handleRescheduleEventManager", `${bookingId}`],
  });

  const allCredentials = await getAllCredentialsIncludeServiceAccountKey(
    initParams.user,
    initParams?.eventType
  );

  const eventManager = new EventManager(
    { ...initParams.user, credentials: allCredentials },
    initParams?.eventTypeAppMetadata
  );

  const updateManager = await eventManager.reschedule(
    evt,
    rescheduleUid,
    newBookingId,
    changedOrganizer,
    previousHostDestinationCalendar
  );

  const results = updateManager.results ?? [];

  const { metadata: videoMetadata, videoCallUrl: _videoCallUrl } = getVideoCallDetails({
    results: results,
  });

  let videoCallUrl = _videoCallUrl;
  let metadata: AdditionalInformation = {};
  metadata = videoMetadata;

  if (results.length) {
    // Handle Google Meet results
    if (bookingLocation === MeetLocationType) {
      const googleMeetResult = {
        appName: GoogleMeetMetadata.name,
        type: "conferencing",
        uid: results[0].uid,
        originalEvent: results[0].originalEvent,
      };

      // Find index of google_calendar inside createManager.referencesToCreate
      const googleCalIndex = updateManager.referencesToCreate.findIndex(
        (ref) => ref.type === "google_calendar"
      );
      const googleCalResult = results[googleCalIndex];

      const t = await getTranslation("en", "common");

      if (!googleCalResult) {
        handleRescheduleEventManager.warn("Google Calendar not installed but using Google Meet as location");
        results.push({
          ...googleMeetResult,
          success: false,
          calWarnings: [t("google_meet_warning")],
        });
      }

      const googleHangoutLink = Array.isArray(googleCalResult?.updatedEvent)
        ? googleCalResult.updatedEvent[0]?.hangoutLink
        : googleCalResult?.updatedEvent?.hangoutLink ?? googleCalResult?.createdEvent?.hangoutLink;

      if (googleHangoutLink) {
        results.push({
          ...googleMeetResult,
          success: true,
        });

        // Add google_meet to referencesToCreate in the same index as google_calendar
        updateManager.referencesToCreate[googleCalIndex] = {
          ...updateManager.referencesToCreate[googleCalIndex],
          meetingUrl: googleHangoutLink,
        };

        // Also create a new referenceToCreate with type video for google_meet
        updateManager.referencesToCreate.push({
          type: "google_meet_video",
          meetingUrl: googleHangoutLink,
          uid: googleCalResult.uid,
          credentialId: updateManager.referencesToCreate[googleCalIndex].credentialId,
        });
      } else if (googleCalResult && !googleHangoutLink) {
        results.push({
          ...googleMeetResult,
          success: false,
        });
      }
    }
    const createdOrUpdatedEvent = Array.isArray(results[0]?.updatedEvent)
      ? results[0]?.updatedEvent[0]
      : results[0]?.updatedEvent ?? results[0]?.createdEvent;
    metadata.hangoutLink = createdOrUpdatedEvent?.hangoutLink;
    metadata.conferenceData = createdOrUpdatedEvent?.conferenceData;
    metadata.entryPoints = createdOrUpdatedEvent?.entryPoints;

    videoCallUrl =
      metadata.hangoutLink || createdOrUpdatedEvent?.url || getVideoCallUrlFromCalEvent(evt) || videoCallUrl;

    const calendarResult = results.find((result) => result.type.includes("_calendar"));

    evt.iCalUID = Array.isArray(calendarResult?.updatedEvent)
      ? calendarResult?.updatedEvent[0]?.iCalUID
      : calendarResult?.updatedEvent?.iCalUID || undefined;
  }
  const newReferencesToCreate = structuredClone(updateManager.referencesToCreate);

  await BookingReferenceRepository.replaceBookingReferences({
    bookingId,
    newReferencesToCreate,
  });

  try {
    if (bookingLocation?.startsWith("http")) {
      videoCallUrl = bookingLocation;
    }

    const newBookingMetaData = videoCallUrl
      ? {
          videoCallUrl: getVideoCallUrlFromCalEvent(evt) || videoCallUrl,
        }
      : undefined;

    await prisma.booking.update({
      where: {
        id: bookingId,
      },
      data: {
        location: bookingLocation,
        iCalUID: evt.iCalUID !== bookingICalUID ? evt.iCalUID : bookingICalUID,
        metadata: { ...(typeof bookingMetadata === "object" && bookingMetadata), ...newBookingMetaData },
      },
    });
  } catch (error) {
    handleRescheduleEventManager.error("Error while updating booking metadata", JSON.stringify({ error }));
  }

  const evtWithAdditionalInfo = {
    ...evt,
    additionalInformation: metadata,
  };

  return { evtWithAdditionalInfo };
};
