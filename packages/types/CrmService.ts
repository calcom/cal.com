import type { CalendarEvent } from "./Calendar";

export interface CRM {
  createEvent: (event: CalendarEvent) => Promise<any>;
  updateEvent: (uid: string, event: CalendarEvent) => Promise<any>;
  deleteEvent: (uid: string, event: CalendarEvent) => Promise<any>;
  getContact: (email: string) => Promise<any>;
}
