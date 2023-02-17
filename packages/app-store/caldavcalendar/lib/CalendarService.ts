import CalendarService from "@calcom/lib/CalendarService";
import type { CredentialPayload } from "@calcom/types/Credential";

export default class CalDavCalendarService extends CalendarService {
  constructor(credential: CredentialPayload) {
    super(credential, "caldav_calendar");
  }
}
