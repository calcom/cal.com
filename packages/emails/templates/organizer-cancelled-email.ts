import { APP_NAME } from "@calcom/lib/constants";

import { renderEmail } from "../";
import generateIcsString from "../lib/generateIcsString";
import OrganizerScheduledEmail from "./organizer-scheduled-email";

export default class OrganizerCancelledEmail extends OrganizerScheduledEmail {
  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    const toAddresses = [this.teamMember?.email || this.calEvent.organizer.email];

    return {
      icalEvent: {
        filename: "event.ics",
        content: generateIcsString({
          event: this.calEvent,
          title: this.t("event_request_cancelled"),
          subtitle: this.t("emailed_you_and_any_other_attendees"),
          status: "CANCELLED",
          role: "organizer",
        }),
        method: "REQUEST",
      },
      from: `${APP_NAME} <${this.getMailerOptions().from}>`,
      to: toAddresses.join(","),
      subject: `${this.t("event_cancelled_subject", {
        title: this.calEvent.title,
        date: this.getFormattedDate(),
      })}`,
      html: await renderEmail("OrganizerCancelledEmail", {
        attendee: this.calEvent.organizer,
        calEvent: this.calEvent,
      }),
      text: this.getTextBody("event_request_cancelled"),
    };
  }
}
