import type { Calendar } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import type ICAL from "ical.js";
import { ICSFeedCalendarService } from "../../ics-feedcalendar/lib/CalendarService";
import { getProtonCalendarExternalId } from "./protonCalendarId";
import { isProtonCalendarUrl } from "./validateProtonCalendarUrl";

class ProtonCalendarService extends ICSFeedCalendarService {
  protected integrationName = "proton_calendar";
  protected readOnlyWarning = "Proton Calendar is read-only";
  protected defaultCalendarName = "Proton Calendar";

  protected shouldIgnoreEvent(vevent: ICAL.Component): boolean {
    return vevent.getFirstPropertyValue("status") === "CANCELLED";
  }

  protected getIgnoredRecurrenceIds(vevents: ICAL.Component[]): Set<string> {
    const ignoredRecurrenceIds = new Set<string>();

    for (const vevent of vevents) {
      if (!this.shouldIgnoreEvent(vevent)) continue;

      const uid = vevent.getFirstPropertyValue<string>("uid");
      const recurrenceId = vevent.getFirstPropertyValue<ICAL.Time>("recurrence-id");
      if (!uid || !recurrenceId) continue;

      ignoredRecurrenceIds.add(this.getRecurrenceKey(uid, recurrenceId));
    }

    return ignoredRecurrenceIds;
  }

  protected getExternalCalendarId(url: string): string {
    return getProtonCalendarExternalId(url);
  }

  protected async fetchCalendar(url: string): Promise<Response> {
    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
    });

    if (response.status < 300 || response.status >= 400) {
      return response;
    }

    const location = response.headers.get("location");
    if (!location) {
      return response;
    }

    const redirectedUrl = new URL(location, url).toString();
    if (!isProtonCalendarUrl(redirectedUrl)) {
      throw new Error("Proton Calendar redirected to an unsupported host");
    }

    return fetch(redirectedUrl, {
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
  }
}

export default function BuildCalendarService(credential: CredentialPayload): Calendar {
  return new ProtonCalendarService(credential);
}
