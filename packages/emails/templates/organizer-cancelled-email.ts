import { APP_NAME } from "@calcom/lib/constants";

import { renderEmail } from "../";
import OrganizerScheduledEmail from "./organizer-scheduled-email";

export default class OrganizerCancelledEmail extends OrganizerScheduledEmail {
  protected getNodeMailerPayload(): Record<string, unknown> {
    const toAddresses = [this.teamMember?.email || this.calEvent.organizer.email];

    return {
      from: `${APP_NAME} <${this.getMailerOptions().from}>`,
      to: toAddresses.join(","),
      subject: `${this.t("event_cancelled_subject", {
        title: this.calEvent.title,
        date: this.getFormattedDate(),
      })}`,
      html: renderEmail("OrganizerCancelledEmail", {
        attendee: this.calEvent.organizer,
        calEvent: this.calEvent,
      }),
      text: this.getTextBody("event_request_cancelled"),
    };
  }
}
