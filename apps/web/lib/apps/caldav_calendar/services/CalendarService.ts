import { Credential } from "@prisma/client";

import { APPS_TYPES } from "../../calendar/constants/general";
import CalendarService from "../../calendar/services/CalendarService";

export default class CalDavCalendarService extends CalendarService {
  constructor(credential: Credential) {
    super(credential, APPS_TYPES.caldav);
  }
}
