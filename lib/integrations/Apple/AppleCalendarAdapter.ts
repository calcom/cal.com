import { Credential } from "@prisma/client";

import { BaseCalendarApiAdapter } from "@lib/BaseCalendarApiAdapter";
import { CalendarApiAdapter } from "@lib/calendarClient";

export class AppleCalendar extends BaseCalendarApiAdapter implements CalendarApiAdapter {
  constructor(credential: Credential) {
    super(credential, "apple_calendar", "https://caldav.icloud.com");
  }
}
