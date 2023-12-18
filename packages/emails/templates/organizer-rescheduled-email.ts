import { APP_NAME } from "@calcom/lib/constants";

import { renderEmail } from "../";
import generateIcsString from "../lib/generateIcsString";
import OrganizerScheduledEmail from "./organizer-scheduled-email";

export default class OrganizerRescheduledEmail extends OrganizerScheduledEmail {
  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    const toAddresses = [this.teamMember?.email || this.calEvent.organizer.email];

    return {
      icalEvent: {
        filename: "event.ics",
        content: generateIcsString({
          event: this.calEvent,
          title: this.t("event_type_has_been_rescheduled"),
          subtitle: this.t("emailed_you_and_any_other_attendees"),
          role: "organizer",
          status: "CONFIRMED",
        }),
        method: "REQUEST",
      },
      from: `${APP_NAME} <${this.getMailerOptions().from}>`,
      to: toAddresses.join(","),
      replyTo: [this.calEvent.organizer.email, ...this.calEvent.attendees.map(({ email }) => email)],
      subject: `${this.calEvent.organizer.language.translate("event_type_has_been_rescheduled_on_time_date", {
        title: this.calEvent.title,
        date: this.getFormattedDate(),
      })}`,
      html: await renderEmail("OrganizerRescheduledEmail", {
        calEvent: { ...this.calEvent, attendeeSeatId: undefined },
        attendee: this.calEvent.organizer,
      }),
      text: this.getTextBody("event_has_been_rescheduled"),
    };
  }
}
