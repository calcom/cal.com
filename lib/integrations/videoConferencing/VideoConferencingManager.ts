import { Credential } from "@prisma/client";
import short from "short-uuid";
import { v5 as uuidv5 } from "uuid";

import { getUid } from "@lib/CalEventParser";
import { EventResult, PartialReference } from "@lib/events/EventManager";
import { CalendarEvent } from "@lib/integrations/calendar/interfaces/Calendar";
import { VIDEO_CONFERENCING_INTEGRATIONS_TYPES } from "@lib/integrations/videoConferencing/constants/generals";
import { VideoConferencingServiceType } from "@lib/integrations/videoConferencing/constants/types";
import VideoConferencingService from "@lib/integrations/videoConferencing/services/BaseVideoConferencingService";
import DailyVideoConferencingService from "@lib/integrations/videoConferencing/services/DailyVideoConferencingService";
import ZoomVideoConferencingService from "@lib/integrations/videoConferencing/services/ZoomVideoConferencingService";
import logger from "@lib/logger";
import { Ensure } from "@lib/types/utils";

const log = logger.getChildLogger({ prefix: ["CalendarManager"] });

const translator = short();

const VIDEO_CONFERENCING: Record<string, VideoConferencingServiceType> = {
  [VIDEO_CONFERENCING_INTEGRATIONS_TYPES.zoom]: ZoomVideoConferencingService,
  [VIDEO_CONFERENCING_INTEGRATIONS_TYPES.daily]: DailyVideoConferencingService,
};

export const getVideoConferencing = (credential: Credential): VideoConferencingService | null => {
  const { type } = credential;

  const videoConferencing = VIDEO_CONFERENCING[type];
  if (!videoConferencing) {
    log.warn(`video conferencing of type ${type} does not implemented`);
    return null;
  }

  return new videoConferencing(credential);
};

export const getBusyVideoTimes = (withCredentials: Credential[]) => {
  const appCredentials = withCredentials
    .map((credential) => getVideoConferencing(credential))
    .filter((valid) => valid) as VideoConferencingService[];

  return Promise.all(appCredentials.map((c) => c.getAvailability())).then((results) =>
    results.reduce((acc, availability) => acc.concat(availability), [])
  );
};

export const createMeeting = async (
  credential: Credential,
  calEvent: Ensure<CalendarEvent, "language">
): Promise<EventResult> => {
  const uid: string = getUid(calEvent);

  if (!credential) {
    throw new Error(
      "Credentials must be set! Video platforms are optional, so this method shouldn't even be called when no video credentials are set."
    );
  }

  const adapter = getVideoConferencing(credential);
  const createdMeeting = await adapter?.createMeeting(calEvent).catch((e: Error) => {
    log.error("createMeeting failed", e, calEvent);
  });

  if (!createdMeeting) {
    return {
      type: credential.type,
      success: false,
      uid,
      originalEvent: calEvent,
    };
  }

  return {
    type: credential.type,
    success: true,
    uid,
    createdEvent: createdMeeting,
    originalEvent: calEvent,
  };
};

export const updateMeeting = async (
  credential: Credential,
  calEvent: CalendarEvent,
  bookingRef: PartialReference | null
): Promise<EventResult> => {
  const uid = translator.fromUUID(uuidv5(JSON.stringify(calEvent), uuidv5.URL));

  let success = true;

  const adapter = getVideoConferencing(credential);
  const updatedMeeting =
    credential && bookingRef
      ? await adapter?.updateMeeting(bookingRef, calEvent).catch((e: Error) => {
          log.error("updateMeeting failed", e, calEvent);
          success = false;
          return undefined;
        })
      : undefined;

  if (!updatedMeeting) {
    return {
      type: credential.type,
      success,
      uid,
      originalEvent: calEvent,
    };
  }

  return {
    type: credential.type,
    success,
    uid,
    updatedEvent: updatedMeeting,
    originalEvent: calEvent,
  };
};

export const deleteMeeting = (credential: Credential, uid: string): Promise<unknown> => {
  if (credential) {
    const adapter = getVideoConferencing(credential);

    if (adapter) {
      return adapter.deleteMeeting(uid);
    }
  }

  return Promise.resolve({});
};
