import dayjs, { Dayjs } from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import timezone from "dayjs/plugin/timezone";
import toArray from "dayjs/plugin/toArray";
import utc from "dayjs/plugin/utc";

import EventOrganizerMail from "@lib/emails/EventOrganizerMail";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(toArray);
dayjs.extend(localizedFormat);

export default class EventOrganizerRequestMail extends EventOrganizerMail {
  protected getBodyHeader(): string {
    return this.calEvent.language("event_awaiting_approval");
  }

  protected getBodyText(): string {
    return this.calEvent.language("check_bookings_page_to_confirm_or_reject");
  }

  protected getAdditionalBody(): string {
    return `<a href="${process.env.BASE_URL}/bookings">${this.calEvent.language(
      "confirm_or_reject_booking"
    )}</a>`;
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
    const organizerStart: Dayjs = dayjs(this.calEvent.startTime).tz(this.calEvent.organizer.timeZone);
    return this.calEvent.language("new_event_request", {
      attendeeName: this.calEvent.attendees[0].name,
      date: organizerStart.format("LT dddd, LL"),
      eventType: this.calEvent.type,
    });
  }
}
