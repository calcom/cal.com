import { WEBAPP_URL } from "@calcom/lib/constants";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import SMSManager from "../sms-manager";

export default class EventSuccessfullyScheduledSMS extends SMSManager {
  constructor(calEvent: CalendarEvent) {
    super(calEvent);
  }

  getMessage(attendee: Person) {
    const t = attendee.language.translate;

    const confirmationText = t("confirming_your_booking_sms", {
      name: attendee.name,
      date: this.getFormattedDate(attendee.timeZone, attendee.language.locale),
    });

    const bookingUrl = `${this.calEvent.bookerUrl ?? WEBAPP_URL}/booking/${this.calEvent.uid}`;

    const urlText = t("you_can_view_booking_details_with_this_url", {
      url: bookingUrl,
    });

    return `${confirmationText}\n\n${urlText}`;
  }
}
