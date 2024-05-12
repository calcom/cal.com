import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import SMSManager from "../sms-manager";

export default class CancelledSeatSMS extends SMSManager {
  constructor(calEvent: CalendarEvent) {
    super(calEvent);
  }

  getMessage(attendee: Person) {
    return `${attendee.language.translate("no_longer_attending", {
      name: attendee.name,
    })} . \n\n ${attendee.language.translate("event_no_longer_attending_subject", {
      name: this.calEvent.team?.name || this.calEvent.organizer.name,
      date: this.getFormattedDate(attendee.timeZone, attendee.language.locale),
    })} `;
  }
}
