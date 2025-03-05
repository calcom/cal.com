import type { calendar_v3 } from "@googleapis/calendar";

import type { FreeBusyArgs } from "@calcom/features/calendar-cache/calendar-cache.repository.interface";
import type {
  Calendar,
  CalendarEvent,
  EventBusyDate,
  IntegrationCalendar,
  NewCalendarEventType,
  SelectedCalendarEventTypeIds,
} from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";

export default class MockCalendarService implements Calendar {
  private integrationName = "";
  private credential: CredentialPayload;
  constructor(credential: CredentialPayload) {
    this.integrationName = "mock_calendar";
    this.credential = credential;
  }

  async createEvent(calEventRaw: CalendarEvent, credentialId: number): Promise<NewCalendarEventType> {
    return {
      uid: "MOCK-UUID",
      id: "MOCK-UUID",
      thirdPartyRecurringEventId: "MOCK-UUID",
      additionalInfo: {
        hangoutLink: "MOCK-HANGOUT-LINK",
      },
      type: "google_calendar",
      password: "",
      url: "",
      iCalUID: "MOCK-ICAL-UID",
    };
  }
  async updateEvent(uid: string, event: CalendarEvent, externalCalendarId: string): Promise<any> {
    return {
      uid: "MOCK-UUID",
      id: "MOCK-UUID",
      thirdPartyRecurringEventId: "MOCK-UUID",
      additionalInfo: {
        hangoutLink: "MOCK-HANGOUT-LINK",
      },
      type: "google_calendar",
      password: "",
      url: "",
      iCalUID: "MOCK-ICAL-UID",
    };
  }

  async deleteEvent(uid: string, event: CalendarEvent, externalCalendarId?: string | null): Promise<void> {
    return;
  }

  async fetchAvailability(requestBody: FreeBusyArgs): Promise<calendar_v3.Schema$FreeBusyResponse> {
    return {
      calendars: {
        "MOCK-CALENDAR-ID": {
          busy: [],
        },
      },
    };
  }

  async getAvailability(
    dateFrom: string,
    dateTo: string,
    selectedCalendars: IntegrationCalendar[],
    shouldServeCache?: boolean
  ): Promise<EventBusyDate[]> {
    return [];
  }

  async listCalendars(): Promise<IntegrationCalendar[]> {
    return [];
  }
  async onWatchedCalendarChanged(calendarId: string, eventId: string) {}
  /**
   * It doesn't check if the subscription has expired or not.
   * It just creates a new subscription.
   */
  async watchCalendar({
    calendarId,
    eventTypeIds,
  }: {
    calendarId: string;
    eventTypeIds: SelectedCalendarEventTypeIds;
  }) {
    return;
  }

  /**
   * GoogleChannel subscription is only stopped when all selectedCalendars are un-watched.
   */
  async unwatchCalendar({
    calendarId,
    eventTypeIds,
  }: {
    calendarId: string;
    eventTypeIds: SelectedCalendarEventTypeIds;
  }) {
    return;
  }
}
