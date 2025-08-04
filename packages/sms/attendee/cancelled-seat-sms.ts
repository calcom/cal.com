import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import SMSManager from "../sms-manager";

export default class CancelledSeatSMS extends SMSManager {
  constructor(calEvent: CalendarEvent) {
    super(calEvent);
  }

  getMessage(attendee: Person) {
    const t = attendee.language.translate;

    const messageText = `${t("no_longer_attending", {
      name: attendee.name,
    })}\n\n${t("event_no_longer_attending_subject", {
      name: this.calEvent.team?.name || this.calEvent.organizer.name,
      date: this.getFormattedDate(attendee.timeZone, attendee.language.locale),
      interpolation: { escapeValue: false },
    })} `;

    return `${messageText}`;
  }
}
