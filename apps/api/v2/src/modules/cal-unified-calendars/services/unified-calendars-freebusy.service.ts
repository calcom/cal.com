import { GOOGLE_CALENDAR_TYPE } from "@calcom/platform-constants";
import type { ConnectedDestinationCalendars } from "@calcom/platform-libraries";
import { Injectable } from "@nestjs/common";
import { CalendarsService } from "@/platform/calendars/services/calendars.service";

type ConnectedCalendarsList = ConnectedDestinationCalendars["connectedCalendars"];
type CalendarToLoad = { credentialId: number; externalId: string };

/** Integration type at runtime (e.g. google_calendar); not always present on shared type. */
function getIntegrationType(c: ConnectedCalendarsList[number]): string | undefined {
  return (c.integration as { type?: string }).type;
}

@Injectable()
export class UnifiedCalendarsFreebusyService {
  constructor(private readonly calendarsService: CalendarsService) {}

  /**
   * Get busy times for a single connection (credential).
   * Fetches the connection's selected calendars, falling back to the primary calendar.
   */
  async getBusyTimesForConnection(
    userId: number,
    credentialId: number,
    from: string,
    to: string,
    timezone: string
  ) {
    const { connectedCalendars } = await this.calendarsService.getCalendarsForConnection(
      userId,
      credentialId
    );
    const conn = connectedCalendars[0];
    let calendarsToLoad: CalendarToLoad[] = (conn.calendars ?? [])
      .filter((cal) => cal.isSelected)
      .map((cal) => ({
        credentialId: cal.credentialId,
        externalId: cal.externalId,
      }));
    if (calendarsToLoad.length === 0 && conn.primary?.externalId) {
      calendarsToLoad = [{ credentialId: conn.credentialId, externalId: conn.primary.externalId ?? "" }];
    }
    if (calendarsToLoad.length === 0) {
      return [];
    }
    return this.calendarsService.getBusyTimes(calendarsToLoad, userId, from, to, timezone);
  }

  /**
   * Get busy times across all Google Calendar connections for a user.
   * Aggregates selected calendars from every Google Calendar connection.
   */
  async getBusyTimesForGoogleCalendars(userId: number, from: string, to: string, timezone: string) {
    const { connectedCalendars } = await this.calendarsService.getCalendars(userId);
    const googleCalendars = connectedCalendars.filter((c) => getIntegrationType(c) === GOOGLE_CALENDAR_TYPE);
    const calendarsToLoad: CalendarToLoad[] = googleCalendars.flatMap((conn) =>
      (conn.calendars ?? [])
        .filter((cal) => cal.isSelected)
        .map((cal) => ({ credentialId: cal.credentialId, externalId: cal.externalId }))
    );
    if (calendarsToLoad.length === 0) {
      return [];
    }
    return this.calendarsService.getBusyTimes(calendarsToLoad, userId, from, to, timezone);
  }
}
