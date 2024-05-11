import { WEBAPP_URL } from "@calcom/lib/constants";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import SMSManager from "../sms-manager";

export default class AwaitingPaymentSMS extends SMSManager {
  constructor(calEvent: CalendarEvent) {
    super(calEvent);
  }

  getMessage(attendee: Person) {
    return `${attendee.language.translate("meeting_awaiting_payment")} . \n\n You can check the event ${
      this.calEvent.bookerUrl ?? WEBAPP_URL
    }/booking/${this.calEvent.uid}?changes=true`;
  }
}
