import { APP_NAME } from "@calcom/lib/constants";

import { renderEmail } from "../";
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
      from: `${APP_NAME} <${this.getMailerOptions().from}>`,
      to: toAddresses.join(","),
      subject: `${this.calEvent.attendees[0].language.translate("booking_submitted_subject", {
        eventType: this.calEvent.type,
        name: this.calEvent.team?.name || this.calEvent.organizer.name,
        date: this.getFormattedDate(),
      })}`,
      html: renderEmail("AttendeeRequestEmail", {
        calEvent: this.calEvent,
        attendee: this.attendee,
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
