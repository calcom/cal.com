import type { CalendarEvent, CalEventResponses } from "./Calendar";

/**
 * Minimal interface for CRM routing trace service.
 * Used to avoid circular dependency between types and app-store packages.
 */
export interface CrmRoutingTraceServiceInterface {
  addStep(domain: string, step: string, data?: Record<string, unknown>): void;
}

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
    crmTrace,
  }: {
    emails: string | string[];
    includeOwner?: boolean;
    forRoundRobinSkip?: boolean;
    crmTrace?: CrmRoutingTraceServiceInterface;
  }) => Promise<Contact[]>;
  createContacts: (
    contactsToCreate: ContactCreateInput[],
    organizerEmail?: string,
    calEventResponses?: CalEventResponses | null
  ) => Promise<Contact[]>;
  getAppOptions: () => any;
  handleAttendeeNoShow?: (
    bookingUid: string,
    attendees: { email: string; noShow: boolean }[]
  ) => Promise<void>;
}
