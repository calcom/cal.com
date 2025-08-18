// eslint-disable-next-line @typescript-eslint/no-var-requires
const BaseCalendarService = require("@calcom/lib/CalendarService").default;

class CalDavCalendarService extends BaseCalendarService {
  constructor(credential) {
    super(credential, "caldav_calendar");
  }
}

module.exports = CalDavCalendarService;
