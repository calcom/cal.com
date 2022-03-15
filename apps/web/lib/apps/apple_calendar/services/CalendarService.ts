import { Credential } from "@prisma/client";

import CalendarService from "@calcom/core/CalendarService";
import { APPS_TYPES } from "@calcom/lib/calendar/constants/general";

import { APPLE_CALENDAR_URL } from "../constants/general";

export default class AppleCalendarService extends CalendarService {
  constructor(credential: Credential) {
    super(credential, APPS_TYPES.apple, APPLE_CALENDAR_URL);
  }
}
