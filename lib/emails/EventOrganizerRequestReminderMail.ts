import dayjs, { Dayjs } from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import timezone from "dayjs/plugin/timezone";
import toArray from "dayjs/plugin/toArray";
import utc from "dayjs/plugin/utc";

import EventOrganizerRequestMail from "@lib/emails/EventOrganizerRequestMail";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(toArray);
dayjs.extend(localizedFormat);

export default class EventOrganizerRequestReminderMail extends EventOrganizerRequestMail {
  protected getBodyHeader(): string {
    return this.calEvent.language("still_waiting_for_approval");
  }

  protected getSubject(): string {
    const organizerStart: Dayjs = dayjs(this.calEvent.startTime).tz(this.calEvent.organizer.timeZone);
    return this.calEvent.language("event_is_still_waiting", {
      attendeeName: this.calEvent.attendees[0].name,
      date: organizerStart.format("LT dddd, LL"),
      eventType: this.calEvent.type,
    });
  }
}
