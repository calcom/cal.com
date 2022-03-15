import { Credential } from "@prisma/client";

import CalendarService from "@calcom/core/CalendarService";
import { APPS_TYPES } from "@calcom/lib/calendar/constants/general";

export default class CalDavCalendarService extends CalendarService {
  constructor(credential: Credential) {
    super(credential, APPS_TYPES.caldav);
  }
}
