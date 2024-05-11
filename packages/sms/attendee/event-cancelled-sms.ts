import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import SMSManager from "../sms-manager";

export default class EventCancelledSMS extends SMSManager {
  constructor(calEvent: CalendarEvent) {
    super(calEvent);
  }

  // TODO: change this message
  getMessage(attendee: Person) {
    return `Hey ${attendee.name}, your booking has been cancelled`;
  }
}
