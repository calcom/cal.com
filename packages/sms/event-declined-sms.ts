import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import SMSManager from "./sms-manager";

export default class EventDeclinedSMS extends SMSManager {
  constructor(calEvent: CalendarEvent) {
    super(calEvent);
  }

  // TODO: change this message
  getMessage(attendee: Person) {
    return `Hey ${attendee.name}, Your event request has been declined`;
  }
}
