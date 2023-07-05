import type { DateArray } from "ics";
import { createEvent } from "ics";

import dayjs from "@calcom/dayjs";
import { getManageLink } from "@calcom/lib/CalEventParser";
import { APP_NAME } from "@calcom/lib/constants";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import { renderEmail } from "..";
import OrganizerScheduledEmail from "./organizer-scheduled-email";

export default class AttendeeWasRequestedToRescheduleEmail extends OrganizerScheduledEmail {
  private metadata: { rescheduleLink: string };
  constructor(calEvent: CalendarEvent, metadata: { rescheduleLink: string }) {
    super({ calEvent });
    this.metadata = metadata;
    this.t = this.calEvent.attendees[0].language.translate;
  }
  protected getNodeMailerPayload(): Record<string, unknown> {
    const toAddresses = [this.calEvent.attendees[0].email];

    return {
      icalEvent: {
        filename: "event.ics",
        content: this.getiCalEventAsString(),
      },
      from: `${APP_NAME} <${this.getMailerOptions().from}>`,
      to: toAddresses.join(","),
      subject: `${this.t("requested_to_reschedule_subject_attendee", {
        eventType: this.calEvent.type,
        name: this.calEvent.attendees[0].name,
      })}`,
      html: renderEmail("AttendeeWasRequestedToRescheduleEmail", {
        calEvent: this.calEvent,
        attendee: this.calEvent.attendees[0],
        metadata: this.metadata,
      }),
      text: this.getTextBody(),
    };
  }

  // @OVERRIDE
  protected getiCalEventAsString(): string | undefined {
    const icsEvent = createEvent({
      start: dayjs(this.calEvent.startTime)
        .utc()
        .toArray()
        .slice(0, 6)
        .map((v, i) => (i === 1 ? v + 1 : v)) as DateArray,
      startInputType: "utc",
      productId: "calcom/ics",
      title: this.t("ics_event_title", {
        eventType: this.calEvent.type,
        name: this.calEvent.attendees[0].name,
      }),
      description: this.getTextBody(),
      duration: { minutes: dayjs(this.calEvent.endTime).diff(dayjs(this.calEvent.startTime), "minute") },
      organizer: { name: this.calEvent.organizer.name, email: this.calEvent.organizer.email },
      attendees: this.calEvent.attendees.map((attendee: Person) => ({
        name: attendee.name,
        email: attendee.email,
      })),
      status: "CANCELLED",
      method: "CANCEL",
    });
    if (icsEvent.error) {
      throw icsEvent.error;
    }
    return icsEvent.value;
  }
  // @OVERRIDE
  protected getWhen(): string {
    return `
    <p style="height: 6px"></p>
    <div style="line-height: 6px;">
      <p style="color: #494949;">${this.t("when")}</p>
      <p style="color: #494949; font-weight: 400; line-height: 24px;text-decoration: line-through;">
      ${this.t(this.getOrganizerStart("dddd").toLowerCase())}, ${this.t(
      this.getOrganizerStart("MMMM").toLowerCase()
    )} ${this.getOrganizerStart("D")}, ${this.getOrganizerStart("YYYY")} | ${this.getOrganizerStart(
      "h:mma"
    )} - ${this.getOrganizerEnd("h:mma")} <span style="color: #888888">(${this.getTimezone()})</span>
      </p>
    </div>`;
  }

  protected getTextBody(): string {
    return `
${this.t("request_reschedule_booking")}
${this.t("request_reschedule_subtitle", {
  organizer: this.calEvent.organizer.name,
})},
${this.getWhen()}
${this.t("need_to_reschedule_or_cancel")}
${getManageLink(this.calEvent, this.t)}
`.replace(/(<([^>]+)>)/gi, "");
  }
}
