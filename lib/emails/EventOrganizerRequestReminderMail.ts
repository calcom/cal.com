import dayjs, { Dayjs } from "dayjs";

import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import toArray from "dayjs/plugin/toArray";
import localizedFormat from "dayjs/plugin/localizedFormat";
import EventOrganizerRequestMail from "@lib/emails/EventOrganizerRequestMail";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(toArray);
dayjs.extend(localizedFormat);

export default class EventOrganizerRequestReminderMail extends EventOrganizerRequestMail {
  protected getBodyHeader(): string {
    return "An event is still waiting for your approval.";
  }

  protected getSubject(): string {
    const organizerStart: Dayjs = <Dayjs>dayjs(this.calEvent.startTime).tz(this.calEvent.organizer.timeZone);
    return `Event request is still waiting: ${this.calEvent.attendees[0].name} - ${organizerStart.format(
      "LT dddd, LL"
    )} - ${this.calEvent.type}`;
  }
}
