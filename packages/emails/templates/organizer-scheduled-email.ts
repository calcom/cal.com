import type { DateArray } from "ics";
import { createEvent } from "ics";
import type { TFunction } from "next-i18next";
import { RRule } from "rrule";

import dayjs from "@calcom/dayjs";
import { getRichDescription } from "@calcom/lib/CalEventParser";
import { APP_NAME } from "@calcom/lib/constants";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import { renderEmail } from "../";
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

  protected getiCalEventAsString(): string | undefined {
    // Taking care of recurrence rule
    let recurrenceRule: string | undefined = undefined;
    if (this.calEvent.recurringEvent?.count) {
      // ics appends "RRULE:" already, so removing it from RRule generated string
      recurrenceRule = new RRule(this.calEvent.recurringEvent).toString().replace("RRULE:", "");
    }
    const icsEvent = createEvent({
      start: dayjs(this.calEvent.startTime)
        .utc()
        .toArray()
        .slice(0, 6)
        .map((v, i) => (i === 1 ? v + 1 : v)) as DateArray,
      startInputType: "utc",
      productId: "calendso/ics",
      title: this.calEvent.title,
      description: this.getTextBody(),
      duration: { minutes: dayjs(this.calEvent.endTime).diff(dayjs(this.calEvent.startTime), "minute") },
      organizer: { name: this.calEvent.organizer.name, email: this.calEvent.organizer.email },
      ...{ recurrenceRule },
      attendees: [
        ...this.calEvent.attendees.map((attendee: Person) => ({
          name: attendee.name,
          email: attendee.email,
        })),
        ...(this.calEvent.team?.members
          ? this.calEvent.team?.members.map((member: Person) => ({
              name: member.name,
              email: member.email,
            }))
          : []),
      ],
      status: "CONFIRMED",
    });
    if (icsEvent.error) {
      throw icsEvent.error;
    }
    return icsEvent.value;
  }

  protected getNodeMailerPayload(): Record<string, unknown> {
    const toAddresses = [this.teamMember?.email || this.calEvent.organizer.email];

    return {
      icalEvent: {
        filename: "event.ics",
        content: this.getiCalEventAsString(),
      },
      from: `${APP_NAME} <${this.getMailerOptions().from}>`,
      to: toAddresses.join(","),
      subject: decodeURIComponent(
        `${this.newSeat ? this.t("new_attendee") + ":" : ""} ${this.calEvent.title}`
      ),
      html: renderEmail("OrganizerScheduledEmail", {
        calEvent: this.calEvent,
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
${getRichDescription(this.calEvent)}
${callToAction}
`.trim();
  }

  protected getTimezone(): string {
    return this.calEvent.organizer.timeZone;
  }

  protected getOrganizerStart(format: string) {
    return this.getRecipientTime(this.calEvent.startTime, format);
  }

  protected getOrganizerEnd(format: string) {
    return this.getRecipientTime(this.calEvent.endTime, format);
  }

  protected getFormattedDate() {
    return `${this.getOrganizerStart("h:mma")} - ${this.getOrganizerEnd("h:mma")}, ${this.t(
      this.getOrganizerStart("dddd").toLowerCase()
    )}, ${this.t(this.getOrganizerStart("MMMM").toLowerCase())} ${this.getOrganizerStart("D, YYYY")}`;
  }
}
