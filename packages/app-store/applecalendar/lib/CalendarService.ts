import CalendarService from "@calcom/lib/CalendarService";
import type { CredentialWithAppName } from "@calcom/types/Credential";

export default class AppleCalendarService extends CalendarService {
  constructor(credential: CredentialWithAppName) {
    super(credential, "apple_calendar", "https://caldav.icloud.com");
  }
}
