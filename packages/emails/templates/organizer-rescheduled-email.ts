import { APP_NAME } from "@calcom/lib/constants";

import { renderEmail } from "../";
import OrganizerScheduledEmail from "./organizer-scheduled-email";

export default class OrganizerRescheduledEmail extends OrganizerScheduledEmail {
  protected getNodeMailerPayload(): Record<string, unknown> {
    const toAddresses = [this.teamMember?.email || this.calEvent.organizer.email];

    return {
      icalEvent: {
        filename: "event.ics",
        content: this.getiCalEventAsString(),
      },
      from: `${APP_NAME} <${this.getMailerOptions().from}>`,
      to: toAddresses.join(","),
      subject: `${this.calEvent.organizer.language.translate("event_type_has_been_rescheduled_on_time_date", {
        title: this.calEvent.title,
        date: `${this.getOrganizerStart("h:mma")} - ${this.getOrganizerEnd(
          "h:mma"
        )}, ${this.calEvent.organizer.language.translate(
          this.getOrganizerStart("dddd").toLowerCase()
        )}, ${this.calEvent.organizer.language.translate(
          this.getOrganizerStart("MMMM").toLowerCase()
        )} ${this.getOrganizerStart("D")}, ${this.getOrganizerStart("YYYY")}`,
      })}`,
      html: renderEmail("OrganizerRescheduledEmail", {
        calEvent: { ...this.calEvent, attendeeSeatId: undefined },
        attendee: this.calEvent.organizer,
      }),
      text: this.getTextBody("event_has_been_rescheduled"),
    };
  }
}
