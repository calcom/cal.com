import type { CalDAVCalendarCredential, ProtonCalendarCredential } from "../CalendarAdapterTypes";

import { CalDAVCalendarAdapter } from "./CalDAVCalendarAdapter";

const PROTON_CALDAV_URL = "https://127.0.0.1:1080/dav/calendars";

/**
 * Proton Calendar adapter -- a thin specialization of CalDAV
 * pre-configured for Proton Bridge's local CalDAV endpoint.
 *
 * Proton Calendar requires Proton Bridge running locally to expose
 * CalDAV access. The default URL points to the local Bridge instance.
 */
export class ProtonCalendarAdapter extends CalDAVCalendarAdapter {
  constructor(credential: ProtonCalendarCredential) {
    const { key } = credential;
    const url = key.url || PROTON_CALDAV_URL;
    super({ id: credential.id, type: "caldav_calendar", key: { username: key.username, password: key.password, url } });
  }
}
