import { getReplyToHeader } from "@calcom/lib/getReplyToHeader";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import renderEmail from "../src/renderEmail";
import OrganizerScheduledEmail from "./organizer-scheduled-email";

export default class OrganizerMultipleAttendeesCancelledSeatEmail extends OrganizerScheduledEmail {
  private attendees: [Person, ...Person[]];
  private isCancelledByHost?: boolean;

  constructor(input: { calEvent: CalendarEvent; attendees: Person[]; isCancelledByHost?: boolean }) {
    super(input);

    if (!input.attendees || input.attendees.length === 0) {
      throw new Error(
        "OrganizerMultipleAttendeesCancelledSeatEmail requires at least one attendee. Cannot create email without attendees."
      );
    }

    this.attendees = input.attendees as [Person, ...Person[]];
    this.isCancelledByHost = input.isCancelledByHost;
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    const attendeeCount = this.attendees.length;
    const attendeeNames = this.getFormattedAttendeeName();

    const subjectKey =
      attendeeCount === 1
        ? "attendee_no_longer_attending_subject"
        : "some_attendees_no_longer_attending_subject";

    return {
      to: `${this.calEvent.organizer.name} <${this.calEvent.organizer.email}>`,
      from: `Cal.com <${this.getMailerOptions().from}>`,
      ...getReplyToHeader(this.calEvent),
      subject: `${this.t(subjectKey, {
        title: this.calEvent.title,
        date: this.getFormattedDate(),
      })}`,
      html: await renderEmail("OrganizerMultipleAttendeesCancelledSeatEmail", {
        calEvent: this.calEvent,
        attendees: this.attendees,
        attendeeCount,
        attendeeNames,
        isCancelledByHost: this.isCancelledByHost,
      }),
      text: this.getTextBody(),
    };
  }

  private getFormattedAttendeeName(): string {
    const count = this.attendees.length;
    if (count === 1) {
      return this.attendees[0].name;
    } else if (count === 2) {
      return `${this.attendees[0].name} ${this.t("and")} ${this.attendees[1].name}`;
    } else {
      const names = this.attendees.map((a) => a.name);
      const lastTwo = names.slice(-2).join(` ${this.t("and")} `);
      const rest = names.slice(0, -2);
      return rest.length > 0 ? `${rest.join(", ")}, ${lastTwo}` : lastTwo;
    }
  }

  protected getTextBody(): string {
    const textBodyKey = this.isCancelledByHost
      ? "event_request_cancelled_by_host"
      : "event_request_cancelled";

    return super.getTextBody(textBodyKey);
  }
}
