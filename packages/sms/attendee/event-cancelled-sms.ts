import { WEBAPP_URL } from "@calcom/lib/constants";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import SMSManager from "../sms-manager";

export default class EventCancelledSMS extends SMSManager {
  constructor(calEvent: CalendarEvent) {
    super(calEvent);
  }

  getMessage(attendee: Person) {
    const t = attendee.language.translate;
    const bookingUrl = `${this.calEvent.bookerUrl ?? WEBAPP_URL}/booking/${this.calEvent.uid}`;

    const messageText = `${t("hey_there")} ${attendee.name}, ${t("event_request_cancelled")}\n\n${t(
      "event_cancelled_subject",
      {
        title: this.calEvent.title,
        date: this.getFormattedDate(attendee.timeZone, attendee.language.locale),
      }
    )}`;

    const urlText = t("you_can_view_booking_details_with_this_url", {
      url: bookingUrl,
    });

    return `${messageText}\n\n${urlText}`;
  }
}
