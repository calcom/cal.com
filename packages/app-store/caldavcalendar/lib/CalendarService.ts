import { Prisma } from "@prisma/client";

import CalendarService from "@calcom/lib/CalendarService";

export default class CalDavCalendarService extends CalendarService {
  constructor(credential: Prisma.CredentialCreateInput) {
    super(credential, "caldav_calendar");
  }
}
