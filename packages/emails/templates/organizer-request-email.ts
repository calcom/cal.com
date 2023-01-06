import { APP_NAME } from "@calcom/lib/constants";

import { renderEmail } from "../";
import OrganizerScheduledEmail from "./organizer-scheduled-email";

export default class OrganizerRequestEmail extends OrganizerScheduledEmail {
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
      from: `${APP_NAME} <${this.getMailerOptions().from}>`,
      to: toAddresses.join(","),
      subject: `${this.t("event_awaiting_approval_subject", {
        eventType: this.calEvent.type,
        name: this.calEvent.attendees[0].name,
        date: this.getFormattedDate(),
      })}`,
      html: renderEmail("OrganizerRequestEmail", {
        calEvent: this.calEvent,
        attendee: this.calEvent.organizer,
      }),
      text: this.getTextBody("event_awaiting_approval"),
    };
  }

  protected getTextBody(title = "event_awaiting_approval"): string {
    return super.getTextBody(
      title,
      `${this.calEvent.organizer.language.translate("someone_requested_an_event")}`,
      "",
      `${this.calEvent.organizer.language.translate("confirm_or_reject_request")}
${process.env.NEXT_PUBLIC_WEBAPP_URL} + ${
        this.calEvent.recurringEvent?.count ? "/bookings/recurring" : "/bookings/upcoming"
      }`
    );
  }
}
