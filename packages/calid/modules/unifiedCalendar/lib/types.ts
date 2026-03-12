export type SupportedCalendarProvider = "google" | "outlook";
export type SupportedSyncProvider = "GOOGLE" | "OUTLOOK";

export type UnifiedEventSource = "INTERNAL" | "EXTERNAL";
export type UnifiedEventStatus = "CONFIRMED" | "CANCELLED" | "TENTATIVE";

export interface ConnectedCalendarRaw {
  id?: string | number | null;
  externalCalendarId?: number | null;
  externalId: string;
  name?: string | null;
  syncEnabled?: boolean;
  syncProvider?: string | null;
  isSelected?: boolean;
  readOnly?: boolean;
}

export interface ConnectedCalendarIntegrationRaw {
  credentialId: number | null;
  integration: {
    type: string;
    name?: string | null;
  };
  primary?: {
    email?: string | null;
  } | null;
  calendars?: ConnectedCalendarRaw[] | null;
}

export interface ConnectedCalendarVM {
  id: string;
  credentialId: number | null;
  externalCalendarId?: number | null;
  providerCalendarId: string;
  syncProvider: SupportedSyncProvider;
  name: string;
  provider: SupportedCalendarProvider;
  email: string;
  color: string;
  syncEnabled: boolean;
  isVisible: boolean;
  readOnly: boolean;
}

export type UnifiedCalendarItem = {
  source: UnifiedEventSource;
  id: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  timeZone?: string | null;
  title?: string | null;
  description?: string | null;
  location?: string | null;
  meetingUrl?: string | null;
  color?: string | null;
  showAsBusy: boolean;
  status: UnifiedEventStatus;
  attendees?: string[];
  external?: {
    calendarId: number;
    provider: string;
    externalEventId: string;
    iCalUID?: string | null;
  };
  internal?: {
    bookingId: number;
    eventTypeId?: number | null;
    attendeeCount?: number | null;
  };
};

export interface UnifiedCalendarEventVM {
  id: string;
  source: UnifiedEventSource;
  status: UnifiedEventStatus;
  start: Date;
  end: Date;
  isAllDay: boolean;
  timeZone?: string | null;
  title: string;
  description?: string | null;
  location?: string | null;
  meetingUrl?: string | null;
  showAsBusy: boolean;
  color: string;
  provider?: SupportedCalendarProvider | null;
  calendarId: string | null;
  calendarName?: string | null;
  external?: UnifiedCalendarItem["external"];
  internal?: UnifiedCalendarItem["internal"];
  attendeeCount?: number | null;
  attendees?: string[];
  canEdit: boolean;
  canDelete: boolean;
  canReschedule: boolean;
  isReadOnly: boolean;
}

export interface UnifiedCalendarBookingFormInput {
  title: string;
  start: Date;
  end: Date;
  calendarId: string;
  attendees: string[];
  location: string | null;
  locationCredentialId?: number | null;
  description?: string;
}

export type ViewMode = "day" | "week" | "month";

export interface QuickBookSlot {
  date: Date;
  hour: number;
}

export interface LegacyMockCalendar {
  id: string;
  name: string;
  provider: SupportedCalendarProvider;
  email: string;
  color: string;
  visible: boolean;
}

export interface LegacyMockEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  calendarId: string;
  location?: string;
  meetingLink?: string;
  attendees: string[];
  description?: string;
}
