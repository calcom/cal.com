/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Credential, SelectedCalendar } from "@prisma/client";
import { TFunction } from "next-i18next";

import { PaymentInfo } from "@ee/lib/stripe/server";

import { getUid } from "@lib/CalEventParser";
import { Event, EventResult } from "@lib/events/EventManager";
import { AppleCalendar } from "@lib/integrations/Apple/AppleCalendarAdapter";
import { CalDavCalendar } from "@lib/integrations/CalDav/CalDavCalendarAdapter";
import {
  GoogleCalendarApiAdapter,
  ConferenceData,
} from "@lib/integrations/GoogleCalendar/GoogleCalendarApiAdapter";
import {
  Office365CalendarApiAdapter,
  BufferedBusyTime,
} from "@lib/integrations/Office365Calendar/Office365CalendarApiAdapter";
import logger from "@lib/logger";
import { VideoCallData } from "@lib/videoClient";

const log = logger.getChildLogger({ prefix: ["[lib] calendarClient"] });

export type Person = { name: string; email: string; timeZone: string };

export interface EntryPoint {
  entryPointType?: string;
  uri?: string;
  label?: string;
  pin?: string;
  accessCode?: string;
  meetingCode?: string;
  passcode?: string;
  password?: string;
}

export interface AdditionInformation {
  conferenceData?: ConferenceData;
  entryPoints?: EntryPoint[];
  hangoutLink?: string;
}

export interface CalendarEvent {
  type: string;
  title: string;
  startTime: string;
  endTime: string;
  description?: string | null;
  team?: {
    name: string;
    members: string[];
  };
  location?: string | null;
  organizer: Person;
  attendees: Person[];
  conferenceData?: ConferenceData;
  language: TFunction;
  additionInformation?: AdditionInformation;
  uid?: string | null;
  videoCallData?: VideoCallData;
  paymentInfo?: PaymentInfo | null;
}

export interface IntegrationCalendar extends Partial<SelectedCalendar> {
  primary?: boolean;
  name?: string;
}

export interface CalendarApiAdapter {
  createEvent(event: CalendarEvent): Promise<Event>;

  updateEvent(uid: string, event: CalendarEvent): Promise<any>;

  deleteEvent(uid: string): Promise<unknown>;

  getAvailability(
    dateFrom: string,
    dateTo: string,
    selectedCalendars: IntegrationCalendar[]
  ): Promise<BufferedBusyTime[]>;

  listCalendars(): Promise<IntegrationCalendar[]>;
}

function getCalendarAdapterOrNull(credential: Credential): CalendarApiAdapter | null {
  switch (credential.type) {
    case "google_calendar":
      return GoogleCalendarApiAdapter(credential);
    case "office365_calendar":
      return Office365CalendarApiAdapter(credential);
    case "caldav_calendar":
      // FIXME types wrong & type casting should not be needed
      return new CalDavCalendar(credential) as never as CalendarApiAdapter;
    case "apple_calendar":
      // FIXME types wrong & type casting should not be needed
      return new AppleCalendar(credential) as never as CalendarApiAdapter;
  }
  return null;
}

/**
 * @deprecated
 */
const calendars = (withCredentials: Credential[]): CalendarApiAdapter[] =>
  withCredentials
    .map((cred) => {
      switch (cred.type) {
        case "google_calendar":
          return GoogleCalendarApiAdapter(cred);
        case "office365_calendar":
          return Office365CalendarApiAdapter(cred);
        case "caldav_calendar":
          return new CalDavCalendar(cred);
        case "apple_calendar":
          return new AppleCalendar(cred);
        default:
          return; // unknown credential, could be legacy? In any case, ignore
      }
    })
    .flatMap((item) => (item ? [item as CalendarApiAdapter] : []));

const getBusyCalendarTimes = (
  withCredentials: Credential[],
  dateFrom: string,
  dateTo: string,
  selectedCalendars: SelectedCalendar[]
) =>
  Promise.all(
    calendars(withCredentials).map((c) => c.getAvailability(dateFrom, dateTo, selectedCalendars))
  ).then((results) => {
    return results.reduce((acc, availability) => acc.concat(availability), []);
  });

/**
 *
 * @param withCredentials
 * @deprecated
 */
const listCalendars = (withCredentials: Credential[]) =>
  Promise.all(calendars(withCredentials).map((c) => c.listCalendars())).then((results) =>
    results.reduce((acc, calendars) => acc.concat(calendars), []).filter((c) => c != null)
  );

const createEvent = async (credential: Credential, calEvent: CalendarEvent): Promise<EventResult> => {
  const uid: string = getUid(calEvent);
  let success = true;

  const creationResult = credential
    ? await calendars([credential])[0]
        .createEvent(calEvent)
        .catch((e) => {
          log.error("createEvent failed", e, calEvent);
          success = false;
          return undefined;
        })
    : undefined;

  if (!creationResult) {
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
    createdEvent: creationResult,
    originalEvent: calEvent,
  };
};

const updateEvent = async (
  credential: Credential,
  calEvent: CalendarEvent,
  bookingRefUid: string | null
): Promise<EventResult> => {
  const uid = getUid(calEvent);
  let success = true;

  const updatedResult =
    credential && bookingRefUid
      ? await calendars([credential])[0]
          .updateEvent(bookingRefUid, calEvent)
          .catch((e) => {
            log.error("updateEvent failed", e, calEvent);
            success = false;
            return undefined;
          })
      : undefined;

  if (!updatedResult) {
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
    updatedEvent: updatedResult,
    originalEvent: calEvent,
  };
};

const deleteEvent = (credential: Credential, uid: string): Promise<unknown> => {
  if (credential) {
    return calendars([credential])[0].deleteEvent(uid);
  }

  return Promise.resolve({});
};

export {
  getBusyCalendarTimes,
  createEvent,
  updateEvent,
  deleteEvent,
  listCalendars,
  getCalendarAdapterOrNull,
};
