import { Credential } from "@prisma/client";

import { APPS_TYPES } from "@calcom/lib/calendar/constants/general";
import CalendarService from "@calcom/lib/calendar/services/CalendarService";

export default class CalDavCalendarService extends CalendarService {
  constructor(credential: Credential) {
    super(credential, APPS_TYPES.caldav);
  }
}
