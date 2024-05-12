import { WEBAPP_URL } from "@calcom/lib/constants";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import SMSManager from "../sms-manager";

export default class EventRequestSMS extends SMSManager {
  constructor(calEvent: CalendarEvent) {
    super(calEvent);
  }

  getMessage(attendee: Person) {
    const t = attendee.language.translate;
    return `${t("booking_submitted", {
      name: attendee.name,
    })}. ${t("user_needs_to_confirm_or_reject_booking", {
      user: this.calEvent.organizer.name,
    })} \n\n ${t("you_can_view_booking_details_with_this_url", {
      url: `${this.calEvent.bookerUrl ?? WEBAPP_URL}/booking/${this.calEvent.uid}`,
    })}`;
  }
}
