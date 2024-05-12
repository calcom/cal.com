import { WEBAPP_URL } from "@calcom/lib/constants";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import SMSManager from "../sms-manager";

export default class EventSuccessfullyScheduledSMS extends SMSManager {
  constructor(calEvent: CalendarEvent) {
    super(calEvent);
  }

  getMessage(attendee: Person) {
    const t = attendee.language.translate;
    return `${t("hey_there")} ${attendee.name}, confirming your booking on  ${this.getFormattedDate(
      attendee.timeZone,
      attendee.language.locale
    )} . \n\n ${t("you_can_view_booking_details_with_this_url", {
      url: `${this.calEvent.bookerUrl ?? WEBAPP_URL}/booking/${this.calEvent.uid}`,
    })}`;
  }
}
