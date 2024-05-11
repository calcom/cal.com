import { WEBAPP_URL } from "@calcom/lib/constants";
import { TimeFormat } from "@calcom/lib/timeFormat";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import SMSManager from "../sms-manager";

export default class EventSuccessfullyScheduledSMS extends SMSManager {
  constructor(calEvent: CalendarEvent) {
    super(calEvent);
  }

  getMessage(attendee: Person) {
    return `Hey ${attendee.name}, confirming your booking on  ${this.getFormattedTime(
      attendee,
      this.calEvent.startTime,
      `dddd, LL | ${TimeFormat.TWELVE_HOUR}`
    )} - ${this.getFormattedTime(attendee, this.calEvent.endTime, TimeFormat.TWELVE_HOUR)} (${
      attendee.timeZone
    }) . \n\n You can view the booking details and add the event to your calendar from this url ${
      this.calEvent.bookerUrl ?? WEBAPP_URL
    }/booking/${this.calEvent.uid} `;
  }
}
