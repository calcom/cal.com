import { WEBAPP_URL } from "@calcom/lib/constants";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import SMSManager from "../sms-manager";

export default class EventLocationChangedSMS extends SMSManager {
  constructor(calEvent: CalendarEvent) {
    super(calEvent);
  }

  getMessage(attendee: Person) {
    const t = attendee.language.translate;

    const messageText = `${t("event_location_changed")}`;

    const bookingUrl = `${this.calEvent.bookerUrl ?? WEBAPP_URL}/booking/${this.calEvent.uid}?changes=true`;

    const urlText = t("you_can_view_booking_details_with_this_url", {
      url: bookingUrl,
      interpolation: { escapeValue: false },
    });

    return `${messageText}\n\n${urlText}`;
  }
}
