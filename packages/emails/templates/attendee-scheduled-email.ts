// eslint-disable-next-line no-restricted-imports
import { cloneDeep } from "lodash";
import type { TFunction } from "next-i18next";

import { getRichDescription } from "@calcom/lib/CalEventParser";
import { TimeFormat } from "@calcom/lib/timeFormat";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import { renderEmail } from "../";
import generateIcsFile, { GenerateIcsRole } from "../lib/generateIcsFile";
import BaseEmail from "./_base-email";

export default class AttendeeScheduledEmail extends BaseEmail {
  calEvent: CalendarEvent;
  attendee: Person;
  showAttendees: boolean | undefined;
  t: TFunction;

  constructor(calEvent: CalendarEvent, attendee: Person, showAttendees?: boolean | undefined) {
    super();
    if (!showAttendees && calEvent.seatsPerTimeSlot) {
      this.calEvent = cloneDeep(calEvent);
      this.calEvent.attendees = [attendee];
    } else {
      this.calEvent = calEvent;
    }
    this.name = "SEND_BOOKING_CONFIRMATION";
    this.attendee = attendee;
    this.t = attendee.language.translate;
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    const clonedCalEvent = cloneDeep(this.calEvent);

    return {
      icalEvent: generateIcsFile({
        calEvent: this.calEvent,
        role: GenerateIcsRole.ATTENDEE,
        status: "CONFIRMED",
      }),
      to: `${this.attendee.name} <${this.attendee.email}>`,
      from: `${this.calEvent.organizer.name} <${this.getMailerOptions().from}>`,
      replyTo: [...this.calEvent.attendees.map(({ email }) => email), this.calEvent.organizer.email],
      subject: `${this.calEvent.title}`,
      html: await this.getHtml(clonedCalEvent, this.attendee),
      text: this.getTextBody(),
    };
  }

  async getHtml(calEvent: CalendarEvent, attendee: Person) {
    return await renderEmail("AttendeeScheduledEmail", {
      calEvent,
      attendee,
    });
  }

  protected getTextBody(title = "", subtitle = "emailed_you_and_any_other_attendees"): string {
    return `
${this.t(
  title
    ? title
    : this.calEvent.recurringEvent?.count
    ? "your_event_has_been_scheduled_recurring"
    : "your_event_has_been_scheduled"
)}
${this.t(subtitle)}

${getRichDescription(this.calEvent, this.t)}
`.trim();
  }

  protected getTimezone(): string {
    // Timezone is based on the first attendee in the attendee list
    // as the first attendee is the one who created the booking
    return this.calEvent.attendees[0].timeZone;
  }

  protected getLocale(): string {
    return this.calEvent.attendees[0].language.locale;
  }

  protected getInviteeStart(format: string) {
    return this.getFormattedRecipientTime({
      time: this.calEvent.startTime,
      format,
    });
  }

  protected getInviteeEnd(format: string) {
    return this.getFormattedRecipientTime({
      time: this.calEvent.endTime,
      format,
    });
  }

  public getFormattedDate() {
    const inviteeTimeFormat = this.calEvent.organizer.timeFormat || TimeFormat.TWELVE_HOUR;

    return `${this.getInviteeStart(inviteeTimeFormat)} - ${this.getInviteeEnd(inviteeTimeFormat)}, ${this.t(
      this.getInviteeStart("dddd").toLowerCase()
    )}, ${this.t(this.getInviteeStart("MMMM").toLowerCase())} ${this.getInviteeStart("D, YYYY")}`;
  }
}
