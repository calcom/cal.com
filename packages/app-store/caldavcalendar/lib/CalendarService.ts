import type { CredentialPayload } from "@calcom/types/Credential";

import CalendarService from "../../_utils/CalendarService.js";

export default class CalDavCalendarService extends CalendarService {
  constructor(credential: CredentialPayload) {
    super(credential, "caldav_calendar");
  }
}
