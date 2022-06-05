import { renderEmail } from "@calcom/emails";

import AttendeeScheduledEmail from "./attendee-scheduled-email";

export default class AttendeeRequestEmail extends AttendeeScheduledEmail {
  protected getNodeMailerPayload(): Record<string, unknown> {
    const toAddresses = [this.calEvent.attendees[0].email];
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
      subject: `${this.calEvent.organizer.language.translate("booking_submitted_subject", {
        eventType: this.calEvent.type,
        name: this.calEvent.attendees[0].name,
        date: `${this.getInviteeStart().format("h:mma")} - ${this.getInviteeEnd().format(
          "h:mma"
        )}, ${this.calEvent.organizer.language.translate(
          this.getInviteeStart().format("dddd").toLowerCase()
        )}, ${this.calEvent.organizer.language.translate(
          this.getInviteeStart().format("MMMM").toLowerCase()
        )} ${this.getInviteeStart().format("D")}, ${this.getInviteeStart().format("YYYY")}`,
      })}`,
      html: renderEmail("AttendeeRequestEmail", {
        calEvent: this.calEvent,
        attendee: this.attendee,
        recurringEvent: this.recurringEvent,
      }),
      text: this.getTextBody(
        this.calEvent.attendees[0].language.translate("booking_submitted", {
          name: this.calEvent.attendees[0].name,
        }),
        this.calEvent.attendees[0].language.translate("user_needs_to_confirm_or_reject_booking", {
          user: this.calEvent.organizer.name,
        })
      ),
    };
  }
}
