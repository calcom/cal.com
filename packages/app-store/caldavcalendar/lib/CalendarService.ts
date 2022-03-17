import { Credential } from "@prisma/client";

import CalendarService from "@calcom/lib/CalendarService";

export default class CalDavCalendarService extends CalendarService {
  constructor(credential: Credential) {
    super(credential, "caldav_calendar");
  }
}
