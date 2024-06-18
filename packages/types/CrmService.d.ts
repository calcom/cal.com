import type { CalendarEvent } from "./Calendar";

export interface CrmData {
  id: string;
  type: string;
  credentialId: number;
  password?: string;
  url?: string;
}

export interface ContactCreateInput {
  email: string;
  name: string;
}

export interface Contact {
  id: string;
  email: string;
  ownerId?: string;
  ownerEmail?: string;
}

export interface CrmEvent {
  id: string;
}

export interface CRM {
  createEvent: (event: CalendarEvent, contacts: Contact[]) => Promise<CrmEvent>;
  updateEvent: (uid: string, event: CalendarEvent) => Promise<CrmEvent>;
  deleteEvent: (uid: string) => Promise<void>;
  getContacts: (emails: string | string[], includeOwner?: boolean) => Promise<Contact[]>;
  createContacts: (contactsToCreate: ContactCreateInput[], organizerEmail?: string) => Promise<Contact[]>;
}
