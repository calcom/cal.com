import type { CredentialPayload } from "@calcom/types/Credential";

import CalendarService from "../../_utils/CalendarService.js";

export default class AppleCalendarService extends CalendarService {
  constructor(credential: CredentialPayload) {
    super(credential, "apple_calendar", "https://caldav.icloud.com");
  }
}
