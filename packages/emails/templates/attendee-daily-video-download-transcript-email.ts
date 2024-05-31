import type { TFunction } from "next-i18next";

import { TimeFormat } from "@calcom/lib/timeFormat";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import { renderEmail } from "../";
import BaseEmail from "./_base-email";

export default class AttendeeDailyVideoDownloadTranscriptEmail extends BaseEmail {
  calEvent: CalendarEvent;
  attendee: Person;
  transcriptDownloadLinks: Array<string>;
  t: TFunction;

  constructor(calEvent: CalendarEvent, attendee: Person, transcriptDownloadLinks: string[]) {
    super();
    this.name = "SEND_TRANSCRIPT_DOWNLOAD_LINK";
    this.calEvent = calEvent;
    this.attendee = attendee;
    this.transcriptDownloadLinks = transcriptDownloadLinks;
    this.t = attendee.language.translate;
  }
  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    return {
      to: `${this.attendee.name} <${this.attendee.email}>`,
      from: `${this.calEvent.organizer.name} <${this.getMailerOptions().from}>`,
      replyTo: [...this.calEvent.attendees.map(({ email }) => email), this.calEvent.organizer.email],
      subject: `${this.t("download_transcript_email_subject", {
        title: this.calEvent.title,
        date: this.getFormattedDate(),
      })}`,
      html: await renderEmail("DailyVideoDownloadTranscriptEmail", {
        title: this.calEvent.title,
        date: this.getFormattedDate(),
        transcriptDownloadLinks: this.transcriptDownloadLinks,
        language: this.t,
        name: this.attendee.name,
      }),
    };
  }

  protected getTimezone(): string {
    return this.attendee.timeZone;
  }

  protected getLocale(): string {
    return this.attendee.language.locale;
  }

  protected getInviteeStart(format: string) {
    return this.getFormattedRecipientTime({
      time: this.calEvent.startTime,
      format,
    });
  }

  protected getInviteeEnd(format: string) {
    return this.getFormattedRecipientTime({
      time: this.calEvent.endTime,
      format,
    });
  }

  protected getFormattedDate() {
    const inviteeTimeFormat = this.attendee.timeFormat || TimeFormat.TWELVE_HOUR;

    return `${this.getInviteeStart(inviteeTimeFormat)} - ${this.getInviteeEnd(inviteeTimeFormat)}, ${this.t(
      this.getInviteeStart("dddd").toLowerCase()
    )}, ${this.t(this.getInviteeStart("MMMM").toLowerCase())} ${this.getInviteeStart("D, YYYY")}`;
  }
}
