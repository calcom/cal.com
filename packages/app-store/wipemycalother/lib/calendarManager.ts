import { Credential } from "@prisma/client";
import _ from "lodash";

import { getUid } from "@calcom/lib/CalEventParser";
import logger from "@calcom/lib/logger";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { EventResult } from "@calcom/types/EventManager";

import { getCalendar } from "../../_utils/getCalendar";

const log = logger.getChildLogger({ prefix: ["CalendarManager"] });

/** TODO: Remove once all references are updated to app-store */
export { getCalendar };

export const createEvent = async (credential: Credential, calEvent: CalendarEvent): Promise<EventResult> => {
  const uid: string = getUid(calEvent);
  const calendar = getCalendar(credential);
  let success = true;

  // Check if the disabledNotes flag is set to true
  if (calEvent.hideCalendarNotes) {
    calEvent.additionalNotes = "Notes have been hidden by the organizer"; // TODO: i18n this string?
  }

  const creationResult = calendar
    ? await calendar.createEvent(calEvent).catch((e) => {
        log.error("createEvent failed", e, calEvent);
        success = false;
        return undefined;
      })
    : undefined;

  return {
    type: credential.type,
    success,
    uid,
    createdEvent: creationResult,
    originalEvent: calEvent,
  };
};

export const updateEvent = async (
  credential: Credential,
  calEvent: CalendarEvent,
  bookingRefUid: string | null
): Promise<EventResult> => {
  const uid = getUid(calEvent);
  const calendar = getCalendar(credential);
  let success = true;

  const updatedResult =
    calendar && bookingRefUid
      ? await calendar.updateEvent(bookingRefUid, calEvent).catch((e) => {
          log.error("updateEvent failed", e, calEvent);
          success = false;
          return undefined;
        })
      : undefined;

  return {
    type: credential.type,
    success,
    uid,
    updatedEvent: updatedResult,
    originalEvent: calEvent,
  };
};

export const deleteEvent = (credential: Credential, uid: string, event: CalendarEvent): Promise<unknown> => {
  const calendar = getCalendar(credential);
  if (calendar) {
    return calendar.deleteEvent(uid, event);
  }

  return Promise.resolve({});
};
