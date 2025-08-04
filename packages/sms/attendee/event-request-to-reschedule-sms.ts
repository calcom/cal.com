import { WEBAPP_URL } from "@calcom/lib/constants";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import SMSManager from "../sms-manager";

export default class EventRequestToRescheduleSMS extends SMSManager {
  constructor(calEvent: CalendarEvent) {
    super(calEvent);
  }

  getMessage(attendee: Person) {
    const t = attendee.language.translate;
    const bookingUrl = `${this.calEvent.bookerUrl ?? WEBAPP_URL}/booking/${this.calEvent.uid}?changes=true`;

    const requestRescheduleSubtitle = t("request_reschedule_subtitle", {
      organizer: this.calEvent.organizer.name,
      interpolation: { escapeValue: false },
    });

    const needToRescheduleOrCancelText = t("need_to_reschedule_or_cancel");

    const messageText = `${needToRescheduleOrCancelText}: ${requestRescheduleSubtitle} \n\n${t(
      "need_to_reschedule_or_cancel"
    )} ${bookingUrl}`;

    return messageText;
  }
}
