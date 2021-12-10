import { Credential, DestinationCalendar, SelectedCalendar } from "@prisma/client";
import { TFunction } from "next-i18next";

import { PaymentInfo } from "@ee/lib/stripe/server";

import { getUid } from "@lib/CalEventParser";
import { Event, EventResult } from "@lib/events/EventManager";
import { AppleCalendar } from "@lib/integrations/Apple/AppleCalendarAdapter";
import { CalDavCalendar } from "@lib/integrations/CalDav/CalDavCalendarAdapter";
import {
  ConferenceData,
  GoogleCalendarApiAdapter,
} from "@lib/integrations/GoogleCalendar/GoogleCalendarApiAdapter";
import { Office365CalendarApiAdapter } from "@lib/integrations/Office365Calendar/Office365CalendarApiAdapter";
import logger from "@lib/logger";
import { VideoCallData } from "@lib/videoClient";

import notEmpty from "./notEmpty";
import { Ensure } from "./types/utils";

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
  destinationCalendar?: DestinationCalendar | null;
}

export interface IntegrationCalendar extends Ensure<Partial<SelectedCalendar>, "externalId"> {
  primary?: boolean;
  name?: string;
}

type EventBusyDate = Record<"start" | "end", Date | string>;

export interface CalendarApiAdapter {
  createEvent(event: CalendarEvent): Promise<Event>;

  updateEvent(uid: string, event: CalendarEvent): Promise<any>;

  deleteEvent(uid: string): Promise<unknown>;

  getAvailability(
    dateFrom: string,
    dateTo: string,
    selectedCalendars: IntegrationCalendar[]
  ): Promise<EventBusyDate[]>;

  listCalendars(): Promise<IntegrationCalendar[]>;
}

function getCalendarAdapterOrNull(credential: Credential): CalendarApiAdapter | null {
  switch (credential.type) {
    case "google_calendar":
      return GoogleCalendarApiAdapter(credential);
    case "office365_calendar":
      return Office365CalendarApiAdapter(credential);
    case "caldav_calendar":
      return new CalDavCalendar(credential);
    case "apple_calendar":
      return new AppleCalendar(credential);
  }
  return null;
}

const getBusyCalendarTimes = async (
  withCredentials: Credential[],
  dateFrom: string,
  dateTo: string,
  selectedCalendars: SelectedCalendar[]
) => {
  const adapters = withCredentials.map(getCalendarAdapterOrNull).filter(notEmpty);
  const results = await Promise.all(
    adapters.map((c) => c.getAvailability(dateFrom, dateTo, selectedCalendars))
  );
  return results.reduce((acc, availability) => acc.concat(availability), []);
};

const createEvent = async (credential: Credential, calEvent: CalendarEvent): Promise<EventResult> => {
  const uid: string = getUid(calEvent);
  const adapter = getCalendarAdapterOrNull(credential);
  let success = true;

  const creationResult = adapter
    ? await adapter.createEvent(calEvent).catch((e) => {
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

const updateEvent = async (
  credential: Credential,
  calEvent: CalendarEvent,
  bookingRefUid: string | null
): Promise<EventResult> => {
  const uid = getUid(calEvent);
  const adapter = getCalendarAdapterOrNull(credential);
  let success = true;

  const updatedResult =
    adapter && bookingRefUid
      ? await adapter.updateEvent(bookingRefUid, calEvent).catch((e) => {
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

const deleteEvent = (credential: Credential, uid: string): Promise<unknown> => {
  const adapter = getCalendarAdapterOrNull(credential);
  if (adapter) {
    return adapter.deleteEvent(uid);
  }

  return Promise.resolve({});
};

export { getBusyCalendarTimes, createEvent, updateEvent, deleteEvent, getCalendarAdapterOrNull };
