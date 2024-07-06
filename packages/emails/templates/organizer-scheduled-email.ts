// eslint-disable-next-line no-restricted-imports
import { cloneDeep } from "lodash";
import type { TFunction } from "next-i18next";

import { getRichDescription } from "@calcom/lib/CalEventParser";
import { APP_NAME } from "@calcom/lib/constants";
import { TimeFormat } from "@calcom/lib/timeFormat";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import { renderEmail } from "../";
import generateIcsString from "../lib/generateIcsString";
import BaseEmail from "./_base-email";

export default class OrganizerScheduledEmail extends BaseEmail {
  calEvent: CalendarEvent;
  t: TFunction;
  newSeat?: boolean;
  teamMember?: Person;

  constructor(input: { calEvent: CalendarEvent; newSeat?: boolean; teamMember?: Person }) {
    super();
    this.name = "SEND_BOOKING_CONFIRMATION";
    this.calEvent = input.calEvent;
    this.t = this.calEvent.organizer.language.translate;
    this.newSeat = input.newSeat;
    this.teamMember = input.teamMember;
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    const clonedCalEvent = cloneDeep(this.calEvent);
    const toAddresses = [this.teamMember?.email || this.calEvent.organizer.email];

    return {
      icalEvent: {
        filename: "event.ics",
        content: generateIcsString({
          event: this.calEvent,
          title: this.calEvent.recurringEvent?.count
            ? this.t("new_event_scheduled_recurring")
            : this.t("new_event_scheduled"),
          subtitle: this.t("emailed_you_and_any_other_attendees"),
          role: "organizer",
          status: "CONFIRMED",
        }),
        method: "REQUEST",
      },
      from: `${APP_NAME} <${this.getMailerOptions().from}>`,
      to: toAddresses.join(","),
      replyTo: [this.calEvent.organizer.email, ...this.calEvent.attendees.map(({ email }) => email)],
      subject: `${this.newSeat ? `${this.t("new_attendee")}: ` : ""}${this.calEvent.title}`,
      html: await renderEmail("OrganizerScheduledEmail", {
        calEvent: clonedCalEvent,
        attendee: this.calEvent.organizer,
        teamMember: this.teamMember,
        newSeat: this.newSeat,
      }),
      text: this.getTextBody(),
    };
  }

  protected getTextBody(
    title = "",
    subtitle = "emailed_you_and_any_other_attendees",
    extraInfo = "",
    callToAction = ""
  ): string {
    return `
${this.t(
  title || this.calEvent.recurringEvent?.count ? "new_event_scheduled_recurring" : "new_event_scheduled"
)}
${this.t(subtitle)}
${extraInfo}
${getRichDescription(this.calEvent, this.t, true)}
${callToAction}
`.trim();
  }

  protected getTimezone(): string {
    return this.calEvent.organizer.timeZone;
  }

  protected getLocale(): string {
    return this.calEvent.organizer.language.locale;
  }

  protected getOrganizerStart(format: string) {
    return this.getFormattedRecipientTime({
      time: this.calEvent.startTime,
      format,
    });
  }

  protected getOrganizerEnd(format: string) {
    return this.getFormattedRecipientTime({
      time: this.calEvent.endTime,
      format,
    });
  }

  protected getFormattedDate() {
    const organizerTimeFormat = this.calEvent.organizer.timeFormat || TimeFormat.TWELVE_HOUR;
    return `${this.getOrganizerStart(organizerTimeFormat)} - ${this.getOrganizerEnd(
      organizerTimeFormat
    )}, ${this.t(this.getOrganizerStart("dddd").toLowerCase())}, ${this.t(
      this.getOrganizerStart("MMMM").toLowerCase()
    )} ${this.getOrganizerStart("D, YYYY")}`;
  }
}
