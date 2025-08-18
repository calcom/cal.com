import type { CredentialPayload } from "@calcom/types/Credential";

import BaseCalendarService from "../../../lib/CalendarService";

export default class AppleCalendarService extends BaseCalendarService {
  constructor(credential: CredentialPayload) {
    super(credential, "apple_calendar", "https://caldav.icloud.com");
  }
}
