import { WEBAPP_URL } from "@calcom/lib/constants";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import SMSManager from "./sms-manager";

export default class EventLocationChangedSMS extends SMSManager {
  constructor(calEvent: CalendarEvent) {
    super(calEvent);
  }

  getMessage(attendee: Person) {
    return `${attendee.language.translate(
      "event_location_changed"
    )} . \n\n You can Check the event ${attendee.language.translate("need_to_reschedule_or_cancel")} ${
      this.calEvent.bookerUrl ?? WEBAPP_URL
    }/booking/${this.calEvent.uid}?changes=true`;
  }
}
