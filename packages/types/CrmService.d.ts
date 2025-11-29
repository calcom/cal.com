import type { CalendarEvent, CalEventResponses } from "./Calendar";

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
  recordType?: string;
}

export interface CrmEvent {
  id: string;
  uid?: string;
  type?: string;
  password?: string;
  url?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  additionalInfo?: any;
}

export interface CRM {
  createEvent: (event: CalendarEvent, contacts: Contact[]) => Promise<CrmEvent | undefined>;
  updateEvent: (uid: string, event: CalendarEvent) => Promise<CrmEvent>;
  deleteEvent: (uid: string, event: CalendarEvent) => Promise<void>;
  getContacts: ({
    emails,
    includeOwner,
    forRoundRobinSkip,
  }: {
    emails: string | string[];
    includeOwner?: boolean;
    forRoundRobinSkip?: boolean;
  }) => Promise<Contact[]>;
  createContacts: (
    contactsToCreate: ContactCreateInput[],
    organizerEmail?: string,
    calEventResponses?: CalEventResponses | null
  ) => Promise<Contact[]>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getAppOptions: () => any;
  handleAttendeeNoShow?: (
    bookingUid: string,
    attendees: { email: string; noShow: boolean }[]
  ) => Promise<void>;
  addContacts?: (uid: string, contacts: Contact[]) => Promise<void>;
}
