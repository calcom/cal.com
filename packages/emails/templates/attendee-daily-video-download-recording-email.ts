// TODO: We should find a way to keep App specific email templates within the App itself
import type { TFunction } from "next-i18next";

import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import { renderEmail } from "../";
import BaseEmail from "./_base-email";

export default class AttendeeDailyVideoDownloadRecordingEmail extends BaseEmail {
  calEvent: CalendarEvent;
  attendee: Person;
  downloadLink: string;
  t: TFunction;

  constructor(calEvent: CalendarEvent, attendee: Person, downloadLink: string) {
    super();
    this.name = "SEND_RECORDING_DOWNLOAD_LINK";
    this.calEvent = calEvent;
    this.attendee = attendee;
    this.downloadLink = downloadLink;
    this.t = attendee.language.translate;
  }
  protected getNodeMailerPayload(): Record<string, unknown> {
    return {
      to: `${this.attendee.name} <${this.attendee.email}>`,
      from: `${this.calEvent.organizer.name} <${this.getMailerOptions().from}>`,
      replyTo: [...this.calEvent.attendees.map(({ email }) => email), this.calEvent.organizer.email],
      subject: `${this.t("download_recording_subject", {
        title: this.calEvent.title,
        date: this.getFormattedDate(),
      })}`,
      html: renderEmail("AttendeeDailyVideoDownloadRecordingEmail", {
        title: this.calEvent.title,
        date: this.getFormattedDate(),
        downloadLink: this.downloadLink,
        language: this.t,
        name: this.attendee.name,
      }),
    };
  }

  protected getTimezone(): string {
    return this.attendee.timeZone;
  }

  protected getInviteeStart(format: string) {
    return this.getRecipientTime(this.calEvent.startTime, format);
  }

  protected getInviteeEnd(format: string) {
    return this.getRecipientTime(this.calEvent.endTime, format);
  }

  protected getFormattedDate() {
    return `${this.getInviteeStart("h:mma")} - ${this.getInviteeEnd("h:mma")}, ${this.t(
      this.getInviteeStart("dddd").toLowerCase()
    )}, ${this.t(this.getInviteeStart("MMMM").toLowerCase())} ${this.getInviteeStart("D, YYYY")}`;
  }
}
