import type { Prisma, DestinationCalendar, SelectedCalendar } from "@prisma/client";
import type { Dayjs } from "dayjs";
import type { calendar_v3 } from "googleapis";
import type { Time } from "ical.js";
import type { TFunction } from "next-i18next";

import type { Frequency } from "@calcom/prisma/zod-utils";

import type { Ensure } from "./utils";

export type { VideoCallData } from "./VideoApiAdapter";

type PaymentInfo = {
  link?: string | null;
  reason?: string | null;
  id?: string | null;
};

export type Person = {
  name: string;
  email: string;
  timeZone: string;
  language: { translate: TFunction; locale: string };
  username?: string;
  id?: number;
  bookingId?: number;
  locale?: string;
};

export type EventBusyDate = {
  start: Date | string;
  end: Date | string;
  source?: string | null;
};

export type EventBusyDetails = EventBusyDate & {
  title?: string;
  source?: string | null;
};

export type CalendarServiceType = typeof Calendar;
export type AdditionalInfo = Record<string, unknown> & { calWarnings?: string[] };

export type NewCalendarEventType = {
  uid: string;
  id: string;
  type: string;
  password: string;
  url: string;
  additionalInfo: AdditionalInfo;
};

export type CalendarEventType = {
  uid: string;
  etag: string;
  /** This is the actual caldav event url, not the location url. */
  url: string;
  summary: string;
  description: string;
  location: string;
  sequence: number;
  startDate: Date | Dayjs;
  endDate: Date | Dayjs;
  duration: {
    weeks: number;
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isNegative: boolean;
  };
  organizer: string;
  attendees: any[][];
  recurrenceId: Time;
  timezone: any;
};

export type BatchResponse = {
  responses: SubResponse[];
};

export type SubResponse = {
  body: {
    value: {
      showAs: "free" | "tentative" | "away" | "busy" | "workingElsewhere";
      start: { dateTime: string };
      end: { dateTime: string };
    }[];
  };
};

export interface ConferenceData {
  createRequest?: calendar_v3.Schema$CreateConferenceRequest;
}

export interface AdditionalInformation {
  conferenceData?: ConferenceData;
  entryPoints?: EntryPoint[];
  hangoutLink?: string;
}

export interface RecurringEvent {
  dtstart?: Date | undefined;
  interval: number;
  count: number;
  freq: Frequency;
  until?: Date | undefined;
  tzid?: string | undefined;
}

export interface BookingLimit {
  PER_DAY?: number | undefined;
  PER_WEEK?: number | undefined;
  PER_MONTH?: number | undefined;
  PER_YEAR?: number | undefined;
}

export type AppsStatus = {
  appName: string;
  type: typeof App["type"];
  success: number;
  failures: number;
  errors: string[];
  warnings?: string[];
};

// If modifying this interface, probably should update builders/calendarEvent files
export interface CalendarEvent {
  type: string;
  title: string;
  startTime: string;
  endTime: string;
  organizer: Person;
  attendees: Person[];
  additionalNotes?: string | null;
  customInputs?: Prisma.JsonObject | null;
  description?: string | null;
  team?: {
    name: string;
    members: string[];
  };
  location?: string | null;
  conferenceData?: ConferenceData;
  additionalInformation?: AdditionalInformation;
  uid?: string | null;
  videoCallData?: VideoCallData;
  paymentInfo?: PaymentInfo | null;
  requiresConfirmation?: boolean | null;
  destinationCalendar?: DestinationCalendar | null;
  cancellationReason?: string | null;
  rejectionReason?: string | null;
  hideCalendarNotes?: boolean;
  recurrence?: string;
  recurringEvent?: RecurringEvent | null;
  eventTypeId?: number | null;
  appsStatus?: AppsStatus[];
  seatsShowAttendees?: boolean | null;
  seatsPerTimeSlot?: number | null;
}

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

export interface AdditionalInformation {
  conferenceData?: ConferenceData;
  entryPoints?: EntryPoint[];
  hangoutLink?: string;
}

export interface IntegrationCalendar extends Ensure<Partial<SelectedCalendar>, "externalId"> {
  primary?: boolean;
  name?: string;
  readOnly?: boolean;
  // For displaying the connected email address
  email?: string;
}

export interface Calendar {
  createEvent(event: CalendarEvent): Promise<NewCalendarEventType>;

  updateEvent(
    uid: string,
    event: CalendarEvent,
    externalCalendarId?: string | null
  ): Promise<NewCalendarEventType | NewCalendarEventType[]>;

  deleteEvent(uid: string, event: CalendarEvent, externalCalendarId?: string | null): Promise<unknown>;

  getAvailability(
    dateFrom: string,
    dateTo: string,
    selectedCalendars: IntegrationCalendar[]
  ): Promise<EventBusyDate[]>;

  listCalendars(event?: CalendarEvent): Promise<IntegrationCalendar[]>;
}
