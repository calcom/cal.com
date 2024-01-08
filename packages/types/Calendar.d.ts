import type { BookingSeat, DestinationCalendar, Prisma, SelectedCalendar } from "@prisma/client";
import type { Dayjs } from "dayjs";
import type { calendar_v3 } from "googleapis";
import type { Time } from "ical.js";
import type { TFunction } from "next-i18next";
import type z from "zod";

import type { bookingResponse } from "@calcom/features/bookings/lib/getBookingResponsesSchema";
import type { Calendar } from "@calcom/features/calendars/weeklyview";
import type { TimeFormat } from "@calcom/lib/timeFormat";
import type { SchedulingType } from "@calcom/prisma/enums";
import type { Frequency } from "@calcom/prisma/zod-utils";
import type { CredentialPayload } from "@calcom/types/Credential";

import type { Ensure } from "./utils";

export type { VideoCallData } from "./VideoApiAdapter";

type PaymentInfo = {
  link?: string | null;
  reason?: string | null;
  id?: string | null;
  paymentOption?: string | null;
  amount?: number;
  currency?: string;
};

export type Person = {
  name: string;
  email: string;
  timeZone: string;
  language: { translate: TFunction; locale: string };
  username?: string;
  id?: number;
  bookingId?: number | null;
  locale?: string | null;
  timeFormat?: TimeFormat;
  bookingSeat?: BookingSeat | null;
};

export type TeamMember = {
  id?: number;
  name: string;
  email: string;
  timeZone: string;
  language: { translate: TFunction; locale: string };
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
  iCalUID?: string | null;
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

export interface RecurringEvent {
  dtstart?: Date | undefined;
  interval: number;
  count: number;
  freq: Frequency;
  until?: Date | undefined;
  tzid?: string | undefined;
}

export type IntervalLimitUnit = "day" | "week" | "month" | "year";

export type IntervalLimit = Partial<Record<`PER_${Uppercase<IntervalLimitUnit>}`, number | undefined>>;

export type AppsStatus = {
  appName: string;
  type: (typeof App)["type"];
  success: number;
  failures: number;
  errors: string[];
  warnings?: string[];
};

export type CalEventResponses = Record<
  string,
  {
    label: string;
    value: z.infer<typeof bookingResponse>;
  }
>;

// If modifying this interface, probably should update builders/calendarEvent files
export interface CalendarEvent {
  // Instead of sending this per event.
  // TODO: Links sent in email should be validated and automatically redirected to org domain or regular app. It would be a much cleaner way. Maybe use existing /api/link endpoint
  bookerUrl?: string;
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
    members: TeamMember[];
    id: number;
  };
  location?: string | null;
  conferenceCredentialId?: number;
  conferenceData?: ConferenceData;
  additionalInformation?: AdditionalInformation;
  uid?: string | null;
  bookingId?: number;
  videoCallData?: VideoCallData;
  paymentInfo?: PaymentInfo | null;
  requiresConfirmation?: boolean | null;
  destinationCalendar?: DestinationCalendar[] | null;
  cancellationReason?: string | null;
  rejectionReason?: string | null;
  hideCalendarNotes?: boolean;
  recurrence?: string;
  recurringEvent?: RecurringEvent | null;
  eventTypeId?: number | null;
  appsStatus?: AppsStatus[];
  seatsShowAttendees?: boolean | null;
  seatsShowAvailabilityCount?: boolean | null;
  attendeeSeatId?: string;
  seatsPerTimeSlot?: number | null;
  schedulingType?: SchedulingType | null;
  iCalUID?: string | null;
  iCalSequence?: number | null;

  // It has responses to all the fields(system + user)
  responses?: CalEventResponses | null;

  // It just has responses to only the user fields. It allows to easily iterate over to show only user fields
  userFieldsResponses?: CalEventResponses | null;
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
  primaryEmail?: string;
  credentialId?: number | null;
  integrationTitle?: string;
}

export interface Calendar {
  createEvent(event: CalendarEvent, credentialId: number): Promise<NewCalendarEventType>;

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

/**
 * @see [How to inference class type that implements an interface](https://stackoverflow.com/a/64765554/6297100)
 */
type Class<I, Args extends any[] = any[]> = new (...args: Args) => I;

export type CalendarClass = Class<Calendar, [CredentialPayload]>;
