import { SelectedCalendar } from "@prisma/client";

import type { CalendarEvent, ConferenceData } from "@calcom/types/CalendarEvent";

import type { Event } from "@lib/events/EventManager";
import { Ensure } from "@lib/types/utils";

import { NewCalendarEventType } from "../types/CalendarTypes";

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

export interface IntegrationCalendar extends Ensure<Partial<SelectedCalendar>, "externalId"> {
  primary?: boolean;
  name?: string;
}

type EventBusyDate = Record<"start" | "end", Date | string>;

export interface Calendar {
  createEvent(event: CalendarEvent): Promise<NewCalendarEventType>;

  updateEvent(uid: string, event: CalendarEvent): Promise<Event | Event[]>;

  deleteEvent(uid: string, event: CalendarEvent): Promise<unknown>;

  getAvailability(
    dateFrom: string,
    dateTo: string,
    selectedCalendars: IntegrationCalendar[]
  ): Promise<EventBusyDate[]>;

  listCalendars(event?: CalendarEvent): Promise<IntegrationCalendar[]>;
}
