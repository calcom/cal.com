// TODO: We should find a way to keep App specific email templates within the App itself
import moment from "moment";
import type { TFunction } from "next-i18next";

import { TimeFormat } from "@calcom/lib/timeFormat";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import { renderEmail } from "../";
import BaseEmail from "./_base-email";

export default class AttendeeDailyVideoDownloadRecordingEmail extends BaseEmail {
  calEvent: CalendarEvent;
  attendee: Person;
  downloadLink: string;
  t: TFunction;

  constructor(calEvent: CalendarEvent, attendee, downloadLink: string) {
    super();
    this.name = "SEND_RECORDING_DOWNLOAD_LINK";
    this.calEvent = calEvent;
    this.attendee = attendee;
    this.downloadLink = downloadLink;
    this.t = attendee.language.translate;
  }
  protected getNodeMailerPayload(): Record<string, unknown> {
    return {
      to: `${this.attendee.email} <${this.attendee.email}>`,
      from: `${this.calEvent.organizer.name} <${this.getMailerOptions().from}>`,
      // replyTo: [...this.calEvent.attendees.map(({ email }) => email), this.calEvent.organizer.email],
      subject: `View Recording: ${this.calEvent.title} at ${moment(this.calEvent.startTime)
        .toDate()
        .toLocaleString()}`,

      html: renderEmail("DailyVideoDownloadRecordingEmail", {
        title: this.calEvent.title,
        date: moment(this.calEvent.startTime).toDate().toLocaleString(),
        downloadLink: this.downloadLink,
        language: this.t,
        name: this.attendee.email,
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
