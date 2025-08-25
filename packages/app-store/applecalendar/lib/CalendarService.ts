// eslint-disable-next-line @typescript-eslint/no-var-requires
const BaseCalendarService = require("@calcom/lib/CalendarService").default;

class AppleCalendarService extends BaseCalendarService {
  constructor(credential) {
    super(credential, "apple_calendar", "https://caldav.icloud.com");
  }
}

module.exports = AppleCalendarService;
