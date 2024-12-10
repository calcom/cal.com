import { WEBAPP_URL } from "@calcom/lib/constants";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import SMSManager from "../sms-manager";

export default class EventCancelledSMS extends SMSManager {
  constructor(calEvent: CalendarEvent) {
    super(calEvent);
  }

  getMessage(attendee: Person) {
    const t = attendee.language.translate;
    return `${t("hey_there")} ${attendee.name}, ${t("event_request_cancelled")}/n/n ${t(
      "event_cancelled_subject",
      {
        title: this.calEvent.title,
        date: this.getFormattedDate(attendee.timeZone, attendee.language.locale),
      }
    )}. /n/n ${t("visit_cancelled_booking")} ${this.calEvent.bookerUrl ?? WEBAPP_URL}/booking/${
      this.calEvent.uid
    } `;
  }
}
