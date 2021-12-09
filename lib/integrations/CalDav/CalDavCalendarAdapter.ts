import { Credential } from "@prisma/client";

import { BaseCalendarApiAdapter } from "@lib/BaseCalendarApiAdapter";
import { CalendarApiAdapter } from "@lib/calendarClient";

export class CalDavCalendar extends BaseCalendarApiAdapter implements CalendarApiAdapter {
  constructor(credential: Credential) {
    super(credential, "caldav_calendar");
  }
}
