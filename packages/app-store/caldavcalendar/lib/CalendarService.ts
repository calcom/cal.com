import type { CredentialPayload } from "@calcom/types/Credential";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const BaseCalendarService = require("../../../lib/CalendarService").default;

export default class CalDavCalendarService extends BaseCalendarService {
  constructor(credential: CredentialPayload) {
    super(credential, "caldav_calendar");
  }
}
