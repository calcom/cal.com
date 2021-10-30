import dayjs, { Dayjs } from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import timezone from "dayjs/plugin/timezone";
import toArray from "dayjs/plugin/toArray";
import utc from "dayjs/plugin/utc";

import { CalendarEvent } from "@lib/calendarClient";
import EventOrganizerMail from "@lib/emails/EventOrganizerMail";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(toArray);
dayjs.extend(localizedFormat);

export default class EventOrganizerRefundFailedMail extends EventOrganizerMail {
  reason: string;
  paymentId: string;

  constructor(calEvent: CalendarEvent, reason: string, paymentId: string) {
    super(calEvent);
    this.reason = reason;
    this.paymentId = paymentId;
  }

  protected getBodyHeader(): string {
    return this.calEvent.language("a_refund_failed");
  }

  protected getBodyText(): string {
    const organizerStart: Dayjs = dayjs(this.calEvent.startTime).tz(this.calEvent.organizer.timeZone);
    return `${this.calEvent.language("refund_failed", {
      eventType: this.calEvent.type,
      userName: this.calEvent.attendees[0].name,
      date: organizerStart.format("LT dddd, LL"),
    })} ${this.calEvent.language("check_with_provider_and_user", {
      userName: this.calEvent.attendees[0].name,
    })}<br>${this.calEvent.language("error_message", { errorMessage: this.reason })}<br>PaymentId: '${
      this.paymentId
    }'`;
  }

  protected getAdditionalBody(): string {
    return "";
  }

  protected getImage(): string {
    return `<svg
      xmlns="http://www.w3.org/2000/svg"
      style="height: 60px; width: 60px; color: #9b0125"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>`;
  }

  protected getSubject(): string {
    const organizerStart: Dayjs = dayjs(this.calEvent.startTime).tz(this.calEvent.organizer.timeZone);
    return this.calEvent.language("refund_failed_subject", {
      userName: this.calEvent.attendees[0].name,
      date: organizerStart.format("LT dddd, LL"),
      eventType: this.calEvent.type,
    });
  }
}
