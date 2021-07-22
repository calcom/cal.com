import dayjs, { Dayjs } from "dayjs";

import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import toArray from "dayjs/plugin/toArray";
import localizedFormat from "dayjs/plugin/localizedFormat";
import EventOrganizerMail from "@lib/emails/EventOrganizerMail";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(toArray);
dayjs.extend(localizedFormat);

export default class EventOrganizerRequestMail extends EventOrganizerMail {
  protected getBodyHeader(): string {
    return "A new event is waiting for your approval.";
  }

  protected getBodyText(): string {
    return "Check your bookings page to confirm or reject the booking.";
  }

  protected getAdditionalBody(): string {
    return `<a href="${process.env.BASE_URL}/bookings">Confirm or reject the booking</a>`;
  }

  protected getImage(): string {
    return `<svg
      xmlns="http://www.w3.org/2000/svg"
      style="height: 60px; width: 60px; color: #01579b"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>`;
  }

  protected getSubject(): string {
    const organizerStart: Dayjs = <Dayjs>dayjs(this.calEvent.startTime).tz(this.calEvent.organizer.timeZone);
    return `New event request: ${this.calEvent.attendees[0].name} - ${organizerStart.format(
      "LT dddd, LL"
    )} - ${this.calEvent.type}`;
  }
}
