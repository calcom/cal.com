import { EMAIL_FROM_NAME } from "@calcom/lib/constants";

import { renderEmail } from "../";
import generateIcsFile, { GenerateIcsRole } from "../lib/generateIcsFile";
import OrganizerScheduledEmail from "./organizer-scheduled-email";

export default class OrganizerReassignedEmail extends OrganizerScheduledEmail {
  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    const toAddresses = [this.teamMember?.email || this.calEvent.organizer.email];

    return {
      icalEvent: generateIcsFile({
        calEvent: this.calEvent,
        status: "CANCELLED",
        role: GenerateIcsRole.ORGANIZER,
      }),
      from: `${EMAIL_FROM_NAME} <${this.getMailerOptions().from}>`,
      to: toAddresses.join(","),
      subject: `${this.t("event_reassigned_subject", {
        title: this.calEvent.title,
        date: this.getFormattedDate(),
      })}`,
      html: await renderEmail("OrganizerReassignedEmail", {
        attendee: this.calEvent.organizer,
        calEvent: this.calEvent,
        reassigned: this.reassigned,
      }),
      text: this.getTextBody("event_request_reassigned"),
    };
  }
}
