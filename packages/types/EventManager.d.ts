import type { CalendarEvent } from "./Calendar";

export interface PartialReference {
  id?: number;
  type: string;
  uid: string;
  meetingId?: string | null;
  meetingPassword?: string | null;
  meetingUrl?: string | null;
  externalCalendarId?: string | null;
  credentialId?: number | null;
}

export interface EventResult<T> {
  type: string;
  appName: string;
  success: boolean;
  uid: string;
  iCalUID?: string | null;
  createdEvent?: T;
  updatedEvent?: T | T[];
  originalEvent: CalendarEvent;
  calError?: string;
  calWarnings?: string[];
}

export interface CreateUpdateResult {
  results: Array<EventResult>;
  referencesToCreate: Array<PartialReference>;
}

export interface PartialBooking {
  id: number;
  userId: number | null;
  references: Array<PartialReference>;
  credentialId?: number;
}
