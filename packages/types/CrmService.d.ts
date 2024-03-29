import type { CalendarEvent } from "./Calendar";

export interface CrmData {
  id: string;
  type: string;
  uid: string;
  credentialId: number;
  password: string;
  url: string;
}

export interface ContactCreateInput {
  email: string;
  name: string;
}

export interface Contact {
  id: string;
  email: string;
}
export interface CRM {
  createEvent: (event: CalendarEvent, contacts: Contact[]) => Promise<any>;
  updateEvent: (uid: string, event: CalendarEvent) => Promise<any>;
  deleteEvent: (uid: string) => Promise<any>;
  getContacts: (email: string | string[]) => Promise<any>;
  createContact: (contactsToCreate: ContactCreateInput[]) => Promise<any>;
}
