export type Person = {
  name?: string;
  email: string;
  timeZone?: string;
};

export type Calendar = {
  listCalendars(event?: CalendarEvent): Promise<IntegrationCalendar[]>;
  createEvent(event: CalendarServiceEvent, credentialId: number): Promise<NewCalendarEventType>;
  updateEvent(uid: string, event: CalendarEvent): Promise<NewCalendarEventType | NewCalendarEventType[]>;
  deleteEvent(uid: string, event: CalendarEvent): Promise<void>;
  getAvailability(params: GetAvailabilityParams): Promise<EventBusyDate[]>;
  getAccountEmail(): string;
};

export type IntegrationCalendar = {
  id: string;
  externalId: string;
  name: string;
  primary?: boolean;
  readOnly?: boolean;
  email?: string;
  integration: string;
  userId?: number | null;
  isDefault?: boolean;
};

export type CalendarEvent = {
  type: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  organizer: Person;
  attendees: Person[];
  location?: string;
  uid?: string;
  destinationCalendar?: IntegrationCalendar[];
  team?: {
    members: Person[];
  };
  hideCalendarEventDetails?: boolean;
  additionalInformation?: string;
};

export type CalendarServiceEvent = CalendarEvent;

export type NewCalendarEventType = {
  uid: string;
  id: string;
  type: string;
  password?: string;
  url?: string;
  additionalInfo?: Record<string, unknown>;
};

export type EventBusyDate = {
  start: string;
  end: string;
};

export type GetAvailabilityParams = {
  dateFrom: string;
  dateTo: string;
  selectedCalendars: IntegrationCalendar[];
};

export type CalendarEventType = {
  uid: string;
  etag?: string;
  url: string;
  summary: string;
  description: string;
  location: string;
  sequence: number;
  startDate: string | Date;
  endDate: string | Date;
  duration: {
    weeks: number;
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isNegative: boolean;
  };
  organizer: Person;
  attendees: Person[];
  recurrenceId: string | null;
  timezone: string;
};

export type TeamMember = Person;
