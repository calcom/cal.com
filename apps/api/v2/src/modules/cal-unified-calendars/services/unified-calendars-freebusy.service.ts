import {
  APPLE_CALENDAR,
  APPLE_CALENDAR_TYPE,
  GOOGLE_CALENDAR,
  GOOGLE_CALENDAR_TYPE,
  OFFICE_365_CALENDAR,
  OFFICE_365_CALENDAR_TYPE,
} from "@calcom/platform-constants";
import type { ConnectedDestinationCalendars } from "@calcom/platform-libraries";
import { Injectable } from "@nestjs/common";
import { CalendarsService } from "@/ee/calendars/services/calendars.service";

type ConnectedCalendarsList = ConnectedDestinationCalendars["connectedCalendars"];
type CalendarToLoad = { credentialId: number; externalId: string };

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
export class UnifiedCalendarsFreebusyService {
  constructor(private readonly calendarsService: CalendarsService) {}

  /**
   * List all supported calendar connections for the user.
   */
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
