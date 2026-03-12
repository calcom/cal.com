import type { BookingStatus } from "@calcom/prisma/client";

export type UnifiedCalendarStatus = "CONFIRMED" | "CANCELLED" | "TENTATIVE";

export type UnifiedCalendarItem = {
  source: "INTERNAL" | "EXTERNAL";
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
  status: UnifiedCalendarStatus;
  attendees?: string[];
  external?: {
    calendarId: number;
    calendarName?: string | null;
    provider: "GOOGLE" | "OUTLOOK" | string;
    externalEventId: string;
    iCalUID?: string | null;
  };
  internal?: {
    bookingId: number;
    eventTypeId?: number | null;
    attendeeCount?: number | null;
  };
};

export interface InternalBookingForUnifiedCalendar {
  id: number;
  startTime: Date;
  endTime: Date;
  title: string | null;
  description: string | null;
  location: string | null;
  meetingUrl: string | null;
  status: BookingStatus;
  eventTypeId: number | null;
  attendeeCount: number;
  attendeeEmails: string[];
}

export interface ExternalEventForUnifiedCalendar {
  id: number;
  calendarId: number;
  calendarName: string | null;
  provider: string;
  externalEventId: string;
  iCalUID: string | null;
  startTime: Date;
  endTime: Date;
  isAllDay: boolean;
  showAsBusy: boolean;
  status: string | null;
  rawPayload: unknown;
}

type RawPayloadLike = {
  summary?: unknown;
  subject?: unknown;
  description?: unknown;
  body?: { content?: unknown };
  location?: unknown;
  hangoutLink?: unknown;
  onlineMeeting?: { joinUrl?: unknown };
  colorId?: unknown;
  color?: unknown;
  start?: { timeZone?: unknown };
  originalStartTimeZone?: unknown;
  calcomResolvedStartTimeZone?: unknown;
  attendees?: unknown;
};

const asObject = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

const toStringOrNull = (value: unknown): string | null => {
  return typeof value === "string" ? value : null;
};

const toEmailOrNull = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) {
    return null;
  }

  return normalized;
};

const extractAttendeeEmailsFromExternalPayload = (payload: RawPayloadLike): string[] => {
  if (!Array.isArray(payload.attendees)) {
    return [];
  }

  const uniqueEmails = new Set<string>();

  for (const attendee of payload.attendees) {
    const attendeeObj = asObject(attendee);
    if (!attendeeObj) {
      const directEmail = toEmailOrNull(attendee);
      if (directEmail) {
        uniqueEmails.add(directEmail);
      }
      continue;
    }

    // Google shape: { email: string }
    const googleEmail = toEmailOrNull(attendeeObj.email);
    if (googleEmail) {
      uniqueEmails.add(googleEmail);
      continue;
    }

    // Outlook shape: { emailAddress: { address: string } }
    const emailAddressObj = asObject(attendeeObj.emailAddress);
    const outlookEmail = toEmailOrNull(emailAddressObj?.address);
    if (outlookEmail) {
      uniqueEmails.add(outlookEmail);
    }
  }

  return Array.from(uniqueEmails);
};

const mapInternalStatus = (status: BookingStatus): UnifiedCalendarStatus => {
  if (status === "CANCELLED" || status === "REJECTED") {
    return "CANCELLED";
  }
  if (status === "PENDING" || status === "AWAITING_HOST") {
    return "TENTATIVE";
  }
  return "CONFIRMED";
};

const mapExternalStatus = (status: string | null): UnifiedCalendarStatus => {
  const normalized = (status ?? "").toUpperCase();
  if (normalized === "CANCELLED") {
    return "CANCELLED";
  }
  if (normalized === "TENTATIVE") {
    return "TENTATIVE";
  }
  return "CONFIRMED";
};

export const mapInternalBookingToUnifiedItem = (
  booking: InternalBookingForUnifiedCalendar
): UnifiedCalendarItem => {
  return {
    source: "INTERNAL",
    id: `INTERNAL:${booking.id}`,
    startTime: booking.startTime.toISOString(),
    endTime: booking.endTime.toISOString(),
    isAllDay: false,
    timeZone: null,
    title: booking.title,
    description: booking.description,
    location: booking.location,
    meetingUrl: booking.meetingUrl,
    color: null,
    showAsBusy: true,
    status: mapInternalStatus(booking.status),
    attendees: booking.attendeeEmails,
    internal: {
      bookingId: booking.id,
      eventTypeId: booking.eventTypeId,
      attendeeCount: booking.attendeeCount,
    },
  };
};

export const mapExternalEventToUnifiedItem = (
  event: ExternalEventForUnifiedCalendar
): UnifiedCalendarItem => {
  const payload = (asObject(event.rawPayload) ?? {}) as RawPayloadLike;
  const body = asObject(payload.body);
  const locationObj = asObject(payload.location);
  const startObj = asObject(payload.start);
  const onlineMeeting = asObject(payload.onlineMeeting);
  const attendees = extractAttendeeEmailsFromExternalPayload(payload);

  return {
    source: "EXTERNAL",
    id: `EXTERNAL:${event.calendarId}:${event.externalEventId}`,
    startTime: event.startTime.toISOString(),
    endTime: event.endTime.toISOString(),
    isAllDay: event.isAllDay,
    timeZone:
      toStringOrNull(payload.originalStartTimeZone) ??
      toStringOrNull(payload.calcomResolvedStartTimeZone) ??
      toStringOrNull(startObj?.timeZone),
    title: toStringOrNull(payload.summary) ?? toStringOrNull(payload.subject),
    description: toStringOrNull(payload.description) ?? toStringOrNull(body?.content),
    location: toStringOrNull(payload.location) ?? toStringOrNull(locationObj?.displayName),
    meetingUrl: toStringOrNull(payload.hangoutLink) ?? toStringOrNull(onlineMeeting?.joinUrl),
    color: toStringOrNull(payload.colorId) ?? toStringOrNull(payload.color),
    showAsBusy: event.showAsBusy,
    status: mapExternalStatus(event.status),
    attendees,
    external: {
      calendarId: event.calendarId,
      calendarName: event.calendarName,
      provider: event.provider,
      externalEventId: event.externalEventId,
      iCalUID: event.iCalUID,
    },
  };
};

const sourceOrder = (source: UnifiedCalendarItem["source"]): number => (source === "INTERNAL" ? 0 : 1);

export const compareUnifiedCalendarItems = (a: UnifiedCalendarItem, b: UnifiedCalendarItem): number => {
  const startCompare = Date.parse(a.startTime) - Date.parse(b.startTime);
  if (startCompare !== 0) {
    return startCompare;
  }

  const endCompare = Date.parse(a.endTime) - Date.parse(b.endTime);
  if (endCompare !== 0) {
    return endCompare;
  }

  const sourceCompare = sourceOrder(a.source) - sourceOrder(b.source);
  if (sourceCompare !== 0) {
    return sourceCompare;
  }

  return a.id.localeCompare(b.id);
};
