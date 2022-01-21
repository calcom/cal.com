import dayjs from "dayjs";
import ICAL from "ical.js";

import AppleCalendarService from "../services/AppleCalendarService";
import CalDavCalendarService from "../services/CalDavCalendarService";
import GoogleCalendarService from "../services/GoogleCalendarService";
import Office365CalendarService from "../services/Office365CalendarService";

export type EventBusyDate = Record<"start" | "end", Date | string>;

export type CalendarServiceType =
  | typeof AppleCalendarService
  | typeof CalDavCalendarService
  | typeof GoogleCalendarService
  | typeof Office365CalendarService;

export type NewCalendarEventType = {
  uid: string;
  id: string;
  type: string;
  password: string;
  url: string;
  additionalInfo: Record<string, any>;
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
  startDate: Date | dayjs.Dayjs;
  endDate: Date | dayjs.Dayjs;
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
  recurrenceId: ICAL.Time;
  timezone: any;
};

export type BatchResponse = {
  responses: SubResponse[];
};

export type SubResponse = {
  body: { value: { start: { dateTime: string }; end: { dateTime: string } }[] };
};
