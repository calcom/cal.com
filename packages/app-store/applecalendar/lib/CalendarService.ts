import { Credential } from "@prisma/client";

import CalendarService from "@calcom/lib/CalendarService";

export default class AppleCalendarService extends CalendarService {
  constructor(credential: Credential) {
    super(credential, "apple_calendar", "https://caldav.icloud.com");
  }
}
