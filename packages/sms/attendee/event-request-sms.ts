import { WEBAPP_URL } from "@calcom/lib/constants";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import SMSManager from "../sms-manager";

export default class EventRequestSMS extends SMSManager {
  constructor(calEvent: CalendarEvent) {
    super(calEvent);
  }

  getMessage(attendee: Person) {
    return `${attendee.language.translate("booking_submitted", {
      name: attendee.name,
    })} . \n\n You can view the booking details and add the event to your calendar from this url ${
      this.calEvent.bookerUrl ?? WEBAPP_URL
    }/booking/${this.calEvent.uid} `;
  }
}
