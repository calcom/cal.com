import type { AppleCalendarCredential, CalDAVCalendarCredential } from "../CalendarAdapterTypes";

import { CalDAVCalendarAdapter } from "./CalDAVCalendarAdapter";

const ICLOUD_CALDAV_URL = "https://caldav.icloud.com";

/**
 * Apple Calendar adapter -- a thin specialization of CalDAV
 * pre-configured for iCloud's CalDAV endpoint.
 *
 * Uses the same CalDAV protocol under the hood; the only difference
 * is the default server URL when none is provided.
 */
export class AppleCalendarAdapter extends CalDAVCalendarAdapter {
  constructor(credential: AppleCalendarCredential) {
    const { key } = credential;
    const url = key.url || ICLOUD_CALDAV_URL;
    super({ id: credential.id, type: "caldav_calendar", key: { username: key.username, password: key.password, url } });
  }
}
