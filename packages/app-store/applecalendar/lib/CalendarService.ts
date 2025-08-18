import type { CredentialPayload } from "@calcom/types/Credential";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const BaseCalendarService = require("@calcom/lib/CalendarService").default;

export default class AppleCalendarService extends BaseCalendarService {
  constructor(credential: CredentialPayload) {
    super(credential, "apple_calendar", "https://caldav.icloud.com");
  }
}
