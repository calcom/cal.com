import type { CalendarEvent } from "./Calendar";
import type { Event } from "./Event";

export interface PartialReference {
  id?: number;
  type: string;
  uid: string;
  meetingId?: string | null;
  meetingPassword?: string | null;
  meetingUrl?: string | null;
}

export interface EventResult {
  type: string;
  success: boolean;
  uid: string;
  createdEvent?: Event;
  updatedEvent?: Event | Event[];
  originalEvent: CalendarEvent;
}

export interface CreateUpdateResult {
  results: Array<EventResult>;
  referencesToCreate: Array<PartialReference>;
}

export interface PartialBooking {
  id: number;
  references: Array<PartialReference>;
}
