import { APP_NAME } from "@calcom/lib/constants";

import { renderEmail } from "../";
import generateIcsString from "../lib/generateIcsString";
import OrganizerScheduledEmail from "./organizer-scheduled-email";

export default class OrganizerLocationChangeEmail extends OrganizerScheduledEmail {
  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    const toAddresses = [this.teamMember?.email || this.calEvent.organizer.email];

    return {
      icalEvent: {
        filename: "event.ics",
        content: generateIcsString({
          event: this.calEvent,
          title: this.t("event_location_changed"),
          subtitle: this.t("emailed_you_and_any_other_attendees"),
          role: "organizer",
          status: "CONFIRMED",
        }),
        method: "REQUEST",
      },
      from: `${APP_NAME} <${this.getMailerOptions().from}>`,
      to: toAddresses.join(","),
      replyTo: [this.calEvent.organizer.email, ...this.calEvent.attendees.map(({ email }) => email)],
      subject: `${this.t("location_changed_event_type_subject", {
        eventType: this.calEvent.type,
        name: this.calEvent.attendees[0].name,
        date: this.getFormattedDate(),
      })}`,
      html: await renderEmail("OrganizerLocationChangeEmail", {
        attendee: this.calEvent.organizer,
        calEvent: this.calEvent,
      }),
      text: this.getTextBody("event_location_changed"),
    };
  }
}
