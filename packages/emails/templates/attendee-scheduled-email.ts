import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import timezone from "dayjs/plugin/timezone";
import toArray from "dayjs/plugin/toArray";
import utc from "dayjs/plugin/utc";
import { createEvent, DateArray } from "ics";
import { TFunction } from "next-i18next";
import rrule from "rrule";

import { getRichDescription } from "@calcom/lib/CalEventParser";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import { renderEmail } from "../";
import BaseEmail from "./_base-email";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(localizedFormat);
dayjs.extend(toArray);

export default class AttendeeScheduledEmail extends BaseEmail {
  calEvent: CalendarEvent;
  attendee: Person;
  t: TFunction;

  constructor(calEvent: CalendarEvent, attendee: Person) {
    super();
    this.name = "SEND_BOOKING_CONFIRMATION";
    this.calEvent = calEvent;
    this.attendee = attendee;
    this.t = attendee.language.translate;
  }

  protected getiCalEventAsString(): string | undefined {
    // Taking care of recurrence rule beforehand
    let recurrenceRule: string | undefined = undefined;
    if (this.calEvent.recurringEvent?.count) {
      // ics appends "RRULE:" already, so removing it from RRule generated string
      recurrenceRule = new rrule(this.calEvent.recurringEvent).toString().replace("RRULE:", "");
    }
    const icsEvent = createEvent({
      start: dayjs(this.calEvent.startTime)
        .utc()
        .toArray()
        .slice(0, 6)
        .map((v, i) => (i === 1 ? v + 1 : v)) as DateArray,
      startInputType: "utc",
      productId: "calendso/ics",
      title: this.t("ics_event_title", {
        eventType: this.calEvent.type,
        name: this.calEvent.attendees[0].name,
      }),
      description: this.getTextBody(),
      duration: { minutes: dayjs(this.calEvent.endTime).diff(dayjs(this.calEvent.startTime), "minute") },
      organizer: { name: this.calEvent.organizer.name, email: this.calEvent.organizer.email },
      attendees: this.calEvent.attendees.map((attendee: Person) => ({
        name: attendee.name,
        email: attendee.email,
      })),
      ...{ recurrenceRule },
      status: "CONFIRMED",
    });
    if (icsEvent.error) {
      throw icsEvent.error;
    }
    return icsEvent.value;
  }

  protected getNodeMailerPayload(): Record<string, unknown> {
    return {
      icalEvent: {
        filename: "event.ics",
        content: this.getiCalEventAsString(),
      },
      to: `${this.attendee.name} <${this.attendee.email}>`,
      from: `${this.calEvent.organizer.name} <${this.getMailerOptions().from}>`,
      replyTo: this.calEvent.organizer.email,
      subject: `${this.t("confirmed_event_type_subject", {
        eventType: this.calEvent.type,
        name: this.calEvent.team?.name || this.calEvent.organizer.name,
        date: this.getFormattedDate(),
      })}`,
      html: renderEmail("AttendeeScheduledEmail", {
        calEvent: this.calEvent,
        attendee: this.attendee,
      }),
      text: this.getTextBody(),
    };
  }

  protected getTextBody(title = "", subtitle = "emailed_you_and_any_other_attendees"): string {
    return `
${this.t(
  title || this.calEvent.recurringEvent?.count
    ? "your_event_has_been_scheduled_recurring"
    : "your_event_has_been_scheduled"
)}
${this.t(subtitle)}

${getRichDescription(this.calEvent)}
`.trim();
  }

  protected getTimezone(): string {
    // Timezone is based on the first attendee in the attendee list
    // as the first attendee is the one who created the booking
    return this.calEvent.attendees[0].timeZone;
  }

  protected getInviteeStart(format: string) {
    return this.getRecipientTime(this.calEvent.startTime, format);
  }

  protected getInviteeEnd(format: string) {
    return this.getRecipientTime(this.calEvent.endTime, format);
  }

  protected getFormattedDate() {
    return `${this.getInviteeStart("h:mma")} - ${this.getInviteeEnd("h:mma")}, ${this.t(
      this.getInviteeStart("dddd").toLowerCase()
    )}, ${this.t(this.getInviteeStart("MMMM").toLowerCase())} ${this.getInviteeStart("D, YYYY")}`;
  }
}
