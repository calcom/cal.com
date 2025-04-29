import { WEBAPP_URL } from "@calcom/lib/constants";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import SMSManager from "../sms-manager";

export default class EventSuccessfullyReScheduledSMS extends SMSManager {
  constructor(calEvent: CalendarEvent) {
    super(calEvent);
  }

  getMessage(attendee: Person) {
    const t = attendee.language.translate;

    const bookerUrl = `${this.calEvent.bookerUrl ?? WEBAPP_URL}/booking/${this.calEvent.uid}`;
    const bookerUrlText = t("you_can_view_booking_details_with_this_url", {
      url: bookerUrl,
      interpolation: { escapeValue: false },
    });

    const eventTypeHasBeenRescheduledOnTimeDateText = t("event_type_has_been_rescheduled_on_time_date", {
      title: this.calEvent.title,
      date: this.getFormattedDate(attendee.timeZone, attendee.language.locale),
      interpolation: { escapeValue: false },
    });

    const messageText = `${t("hey_there")} ${
      attendee.name
    }, ${eventTypeHasBeenRescheduledOnTimeDateText} \n\n${bookerUrlText}`;

    return messageText;
  }
}
