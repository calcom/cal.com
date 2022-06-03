import { renderEmail } from "@calcom/emails";

import OrganizerScheduledEmail from "./organizer-scheduled-email";

export default class OrganizerCancelledEmail extends OrganizerScheduledEmail {
  protected getNodeMailerPayload(): Record<string, unknown> {
    const toAddresses = [this.calEvent.organizer.email];
    if (this.calEvent.team) {
      this.calEvent.team.members.forEach((member) => {
        const memberAttendee = this.calEvent.attendees.find((attendee) => attendee.name === member);
        if (memberAttendee) {
          toAddresses.push(memberAttendee.email);
        }
      });
    }

    return {
      from: `Cal.com <${this.getMailerOptions().from}>`,
      to: toAddresses.join(","),
      subject: `${this.t("event_cancelled_subject", {
        eventType: this.calEvent.type,
        name: this.calEvent.attendees[0].name,
        date: `${this.getOrganizerStart("h:mma")} - ${this.getOrganizerEnd("h:mma")}, ${this.t(
          this.getOrganizerStart("dddd").toLowerCase()
        )}, ${this.t(this.getOrganizerStart("MMMM").toLowerCase())} ${this.getOrganizerStart("D, YYYY")}`,
      })}`,
      html: renderEmail("OrganizerCancelledEmail", {
        attendee: this.calEvent.organizer,
        calEvent: this.calEvent,
        recurringEvent: this.recurringEvent,
      }),
      text: this.getTextBody("event_request_cancelled"),
    };
  }
}
