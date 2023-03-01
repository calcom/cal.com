import type { DateArray } from "ics";
import { createEvent } from "ics";
import type { TFunction } from "next-i18next";
import { RRule } from "rrule";

import dayjs from "@calcom/dayjs";
import { getRichDescription } from "@calcom/lib/CalEventParser";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import { renderEmail } from "../";
import BaseEmail from "./_base-email";

export default class AttendeeScheduledEmail extends BaseEmail {
  calEvent: CalendarEvent;
  attendee: Person;
  showAttendees: boolean | undefined;
  t: TFunction;

  constructor(calEvent: CalendarEvent, attendee: Person, showAttendees?: boolean | undefined) {
    super();
    this.name = "SEND_BOOKING_CONFIRMATION";
    this.calEvent = calEvent;
    this.attendee = attendee;
    this.showAttendees = showAttendees;
    this.t = attendee.language.translate;

    if (!this.showAttendees) {
      this.calEvent.attendees = [this.attendee];
    }
  }

  protected getiCalEventAsString(): string | undefined {
    // Taking care of recurrence rule
    let recurrenceRule: string | undefined = undefined;
    if (this.calEvent.recurringEvent?.count) {
      // ics appends "RRULE:" already, so removing it from RRule generated string
      recurrenceRule = new RRule(this.calEvent.recurringEvent).toString().replace("RRULE:", "");
    }
    const icsEvent = createEvent({
      start: dayjs(this.calEvent.startTime)
        .utc()
        .toArray()
        .slice(0, 6)
        .map((v, i) => (i === 1 ? v + 1 : v)) as DateArray,
      startInputType: "utc",
      productId: "calendso/ics",
      title: this.calEvent.title,
      description: this.getTextBody(),
      duration: { minutes: dayjs(this.calEvent.endTime).diff(dayjs(this.calEvent.startTime), "minute") },
      organizer: { name: this.calEvent.organizer.name, email: this.calEvent.organizer.email },
      attendees: [
        ...this.calEvent.attendees.map((attendee: Person) => ({
          name: attendee.name,
          email: attendee.email,
        })),
        ...(this.calEvent.team?.members
          ? this.calEvent.team?.members.map((member: Person) => ({
              name: member.name,
              email: member.email,
            }))
          : []),
      ],
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
      replyTo: [...this.calEvent.attendees.map(({ email }) => email), this.calEvent.organizer.email],
      subject: decodeURIComponent(`${this.calEvent.title}`),
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

  public getFormattedDate() {
    return `${this.getInviteeStart("h:mma")} - ${this.getInviteeEnd("h:mma")}, ${this.t(
      this.getInviteeStart("dddd").toLowerCase()
    )}, ${this.t(this.getInviteeStart("MMMM").toLowerCase())} ${this.getInviteeStart("D, YYYY")}`;
  }
}
