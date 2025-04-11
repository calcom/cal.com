import BaseCalendarService from "@calcom/lib/CalendarService";
import type { CredentialPayload } from "@calcom/types/Credential";

export default class CalDavCalendarService extends BaseCalendarService {
  constructor(credential: CredentialPayload) {
    super(credential, "caldav_calendar");
  }
}
