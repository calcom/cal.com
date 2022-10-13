import { Prisma } from "@prisma/client";

import CalendarService from "@calcom/lib/CalendarService";

export default class AppleCalendarService extends CalendarService {
  constructor(credential: Prisma.CredentialCreateInput) {
    super(credential, "apple_calendar", "https://caldav.icloud.com");
  }
}
