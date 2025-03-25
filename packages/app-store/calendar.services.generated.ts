import * as AppleCalendarService from "./applecalendar/lib/CalendarService";
import * as CaldavCalendarService from "./caldavcalendar/lib/CalendarService";
import * as Exchange2013CalendarService from "./exchange2013calendar/lib/CalendarService";
import * as Exchange2016CalendarService from "./exchange2016calendar/lib/CalendarService";
import * as ExchangeCalendarService from "./exchangecalendar/lib/CalendarService";
import * as FeishuCalendarService from "./feishucalendar/lib/CalendarService";
import * as GoogleCalendarService from "./googlecalendar/lib/CalendarService";
import * as IcsFeedCalendarService from "./ics-feedcalendar/lib/CalendarService";
import * as LarkCalendarService from "./larkcalendar/lib/CalendarService";
import * as Office365CalendarService from "./office365calendar/lib/CalendarService";
import * as ZohoCalendarService from "./zohocalendar/lib/CalendarService";

// Static imports for dynamic imports
export const CalendarServiceMap = {
  applecalendar: AppleCalendarService,
  caldavcalendar: CaldavCalendarService,
  exchange2013calendar: Exchange2013CalendarService,
  exchange2016calendar: Exchange2016CalendarService,
  exchangecalendar: ExchangeCalendarService,
  feishucalendar: FeishuCalendarService,
  googlecalendar: GoogleCalendarService,
  "ics-feedcalendar": IcsFeedCalendarService,
  larkcalendar: LarkCalendarService,
  office365calendar: Office365CalendarService,
  zohocalendar: ZohoCalendarService,
};
