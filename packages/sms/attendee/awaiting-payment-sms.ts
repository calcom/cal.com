import { WEBAPP_URL } from "@calcom/lib/constants";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import SMSManager from "../sms-manager";

export default class AwaitingPaymentSMS extends SMSManager {
  constructor(calEvent: CalendarEvent) {
    super(calEvent);
  }

  getMessage(attendee: Person) {
    const t = attendee.language.translate;
    return `${t("meeting_awaiting_payment")}: ${t("complete_your_booking_subject", {
      title: this.calEvent.title,
      date: this.getFormattedDate(attendee.timeZone, attendee.language.locale),
    })} . \n\n ${t("you_can_view_booking_details_with_this_url", {
      url: `${this.calEvent.bookerUrl ?? WEBAPP_URL}/booking/${this.calEvent.uid}?changes=true`,
    })} `;
  }
}
