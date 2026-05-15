/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference path="../../../types/ical.d.ts"/>

import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import type {
  Calendar,
  CalendarEvent,
  IntegrationCalendar,
  NewCalendarEventType,
} from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import type ICAL from "ical.js";
import { ICSFeedCalendarService } from "../../ics-feedcalendar/lib/CalendarService";
import { isProtonCalendarUrl } from "./isProtonCalendarUrl";

const READ_ONLY_WARNING = "Proton Calendar is read-only. Cal.com can use it for availability only.";

class ProtonCalendarService extends ICSFeedCalendarService implements Calendar {
  protected integrationName = "proton_calendar";
  protected readOnlyWarning = READ_ONLY_WARNING;

  protected async fetchCalendar(url: string): Promise<Response> {
    let signal: AbortSignal | undefined;

    if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
      signal = AbortSignal.timeout(10_000);
    }

    let currentUrl = url;

    for (let redirects = 0; redirects <= 3; redirects += 1) {
      if (!isProtonCalendarUrl(currentUrl)) {
        throw new ErrorWithCode(ErrorCode.BadRequest, "Invalid Proton Calendar URL");
      }

      const response = await fetch(currentUrl, {
        redirect: "manual",
        signal,
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");

        if (!location) {
          throw new ErrorWithCode(ErrorCode.BadRequest, "Proton Calendar redirect is missing a location");
        }

        currentUrl = new URL(location, currentUrl).toString();
        continue;
      }

      if (!response.ok) {
        throw new ErrorWithCode(
          ErrorCode.BadRequest,
          `Could not fetch Proton Calendar feed: ${response.status}`
        );
      }

      return response;
    }

    throw new ErrorWithCode(ErrorCode.BadRequest, "Too many redirects while fetching Proton Calendar feed");
  }

  protected shouldImportEvent(vevent: ICAL.Component): boolean {
    const status = String(vevent.getFirstPropertyValue("status") || "").toUpperCase();
    return status !== "CANCELLED";
  }

  createEvent(event: CalendarEvent, _credentialId: number): Promise<NewCalendarEventType> {
    return Promise.resolve({
      uid: event.uid || "",
      type: this.integrationName,
      id: "",
      password: "",
      url: "",
      additionalInfo: { calWarnings: [READ_ONLY_WARNING] },
    });
  }

  updateEvent(
    _uid: string,
    event: CalendarEvent,
    _externalCalendarId?: string | null
  ): Promise<NewCalendarEventType> {
    return this.createEvent(event, 0);
  }

  deleteEvent(_uid: string, _event: CalendarEvent, _externalCalendarId?: string | null): Promise<unknown> {
    return Promise.resolve();
  }

  async listCalendars(): Promise<IntegrationCalendar[]> {
    const calendars = await super.listCalendars();

    return calendars.map((calendar) => ({
      ...calendar,
      name: calendar.name || "Proton Calendar",
      readOnly: true,
      integration: this.integrationName,
      integrationTitle: "Proton Calendar",
    }));
  }
}

export default function BuildCalendarService(credential: CredentialPayload): Calendar {
  return new ProtonCalendarService(credential);
}
