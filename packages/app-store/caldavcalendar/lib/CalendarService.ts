import type { CredentialPayload } from "@calcom/types/Credential";

import BaseCalendarService from "../../../lib/CalendarService";

export default class CalDavCalendarService extends BaseCalendarService {
  constructor(credential: CredentialPayload) {
    super(credential, "caldav_calendar");
  }
}
