import {
  APPLE_CALENDAR,
  APPLE_CALENDAR_TYPE,
  GOOGLE_CALENDAR,
  GOOGLE_CALENDAR_TYPE,
  OFFICE_365_CALENDAR,
  OFFICE_365_CALENDAR_TYPE,
} from "@calcom/platform-constants";
import type { ConnectedDestinationCalendars } from "@calcom/platform-libraries";
import { BadRequestException, Injectable } from "@nestjs/common";
import { CalendarsService } from "@/platform/calendars/services/calendars.service";
import type { CreateUnifiedCalendarEventInput } from "@/modules/cal-unified-calendars/inputs/create-unified-calendar-event.input";
import type { UpdateUnifiedCalendarEventInput } from "@/modules/cal-unified-calendars/inputs/update-unified-calendar-event.input";
import {
  GoogleCalendarEventOutputPipe,
  GoogleCalendarEventResponse,
} from "@/modules/cal-unified-calendars/pipes/get-calendar-event-details-output-pipe";
import { GoogleCalendarService } from "@/modules/cal-unified-calendars/services/google-calendar.service";
import { UnifiedCalendarsFreebusyService } from "@/modules/cal-unified-calendars/services/unified-calendars-freebusy.service";

type ConnectedCalendarsList = ConnectedDestinationCalendars["connectedCalendars"];

/** Integration type at runtime (e.g. google_calendar); not always present on shared type. */
function getIntegrationType(c: ConnectedCalendarsList[number]): string | undefined {
  return (c.integration as { type?: string }).type;
}

function getPrimaryEmail(c: ConnectedCalendarsList[number]): string | null | undefined {
  return (c.primary as { email?: string } | undefined)?.email;
}

const INTEGRATION_TYPE_TO_API: Record<
  string,
  typeof GOOGLE_CALENDAR | typeof OFFICE_365_CALENDAR | typeof APPLE_CALENDAR
> = {
  [GOOGLE_CALENDAR_TYPE]: GOOGLE_CALENDAR,
  [OFFICE_365_CALENDAR_TYPE]: OFFICE_365_CALENDAR,
  [APPLE_CALENDAR_TYPE]: APPLE_CALENDAR,
};

@Injectable()
export class UnifiedCalendarService {
  private readonly pipe = new GoogleCalendarEventOutputPipe();

  constructor(
    private readonly googleCalendarService: GoogleCalendarService,
    private readonly freebusyService: UnifiedCalendarsFreebusyService,
    private readonly calendarsService: CalendarsService
  ) {}

  // ─── Strategy: validate calendar type ──────────────────────────────────

  private ensureGoogleCalendar(calendar: string, action: string): void {
    if (calendar !== GOOGLE_CALENDAR) {
      throw new BadRequestException(
        `${action} is currently only available for Google Calendar. Office 365 and Apple support is coming soon.`
      );
    }
  }

  private transformEvent(event: GoogleCalendarEventResponse) {
    return this.pipe.transform(event);
  }

  private transformEvents(events: GoogleCalendarEventResponse[]) {
    return events.map((e) => this.pipe.transform(e));
  }

  // ─── Connections ───────────────────────────────────────────────────────

  async getConnections(
    userId: number
  ): Promise<Array<{ connectionId: string; type: "google" | "office365" | "apple"; email: string | null }>> {
    const { connectedCalendars } = await this.calendarsService.getCalendars(userId);
    return connectedCalendars
      .filter(
        (c) =>
          getIntegrationType(c) === GOOGLE_CALENDAR_TYPE ||
          getIntegrationType(c) === OFFICE_365_CALENDAR_TYPE ||
          getIntegrationType(c) === APPLE_CALENDAR_TYPE
      )
      .map((c) => {
        const apiType = INTEGRATION_TYPE_TO_API[getIntegrationType(c) ?? ""];
        const email = c.primary?.externalId ?? getPrimaryEmail(c) ?? null;
        return {
          connectionId: String(c.credentialId),
          type: apiType ?? GOOGLE_CALENDAR,
          email: email || null,
        };
      });
  }

  // ─── User-scoped calendar operations ───────────────────────────────────

  async getEventDetails(calendar: string, eventUid: string) {
    this.ensureGoogleCalendar(calendar, "Meeting details");
    const event = await this.googleCalendarService.getEventDetails(eventUid);
    return this.transformEvent(event);
  }

  async updateEventDetails(calendar: string, eventUid: string, updateData: UpdateUnifiedCalendarEventInput) {
    this.ensureGoogleCalendar(calendar, "Event updates");
    const event = await this.googleCalendarService.updateEventDetails(eventUid, updateData);
    return this.transformEvent(event);
  }

  async listEvents(calendar: string, userId: number, calendarId: string, timeMin: string, timeMax: string) {
    this.ensureGoogleCalendar(calendar, "List events");
    const events = await this.googleCalendarService.listEventsForUser(userId, calendarId, timeMin, timeMax);
    return this.transformEvents(events);
  }

  async createEvent(calendar: string, userId: number, calendarId: string, body: CreateUnifiedCalendarEventInput) {
    this.ensureGoogleCalendar(calendar, "Create event");
    const event = await this.googleCalendarService.createEventForUser(userId, calendarId, body);
    return this.transformEvent(event);
  }

  async deleteEvent(calendar: string, userId: number, calendarId: string, eventUid: string) {
    this.ensureGoogleCalendar(calendar, "Delete event");
    await this.googleCalendarService.deleteEventForUser(userId, calendarId, eventUid);
  }

  async getFreeBusy(calendar: string, userId: number, from: string, to: string, timezone: string) {
    this.ensureGoogleCalendar(calendar, "Free/busy");
    return this.freebusyService.getBusyTimesForGoogleCalendars(userId, from, to, timezone);
  }

  // ─── Connection-scoped operations ──────────────────────────────────────

  async listConnectionEvents(
    userId: number,
    credentialId: number,
    calendarId: string,
    timeMin: string,
    timeMax: string
  ) {
    const events = await this.googleCalendarService.listEventsForUserByConnectionId(
      userId,
      credentialId,
      calendarId,
      timeMin,
      timeMax
    );
    return this.transformEvents(events);
  }

  async createConnectionEvent(
    userId: number,
    credentialId: number,
    calendarId: string,
    body: CreateUnifiedCalendarEventInput
  ) {
    const event = await this.googleCalendarService.createEventForUserByConnectionId(
      userId,
      credentialId,
      calendarId,
      body
    );
    return this.transformEvent(event);
  }

  async getConnectionEvent(userId: number, credentialId: number, calendarId: string, eventId: string) {
    const event = await this.googleCalendarService.getEventByConnectionId(userId, credentialId, calendarId, eventId);
    return this.transformEvent(event);
  }

  async updateConnectionEvent(
    userId: number,
    credentialId: number,
    calendarId: string,
    eventId: string,
    updateData: UpdateUnifiedCalendarEventInput
  ) {
    const event = await this.googleCalendarService.updateEventByConnectionId(
      userId,
      credentialId,
      calendarId,
      eventId,
      updateData
    );
    return this.transformEvent(event);
  }

  async deleteConnectionEvent(userId: number, credentialId: number, calendarId: string, eventId: string) {
    await this.googleCalendarService.deleteEventForUserByConnectionId(userId, credentialId, calendarId, eventId);
  }

  async getConnectionFreeBusy(userId: number, credentialId: number, from: string, to: string, timezone: string) {
    return this.freebusyService.getBusyTimesForConnection(userId, credentialId, from, to, timezone);
  }
}
