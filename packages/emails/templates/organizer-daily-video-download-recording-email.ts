import type { TFunction } from "next-i18next";

import { APP_NAME } from "@calcom/lib/constants";
import type { CalendarEvent } from "@calcom/types/Calendar";

import { renderEmail } from "../";
import BaseEmail from "./_base-email";

export default class OrganizerDailyVideoDownloadRecordingEmail extends BaseEmail {
  calEvent: CalendarEvent;
  downloadLink: string;
  t: TFunction;

  constructor(calEvent: CalendarEvent, downloadLink: string) {
    super();
    this.name = "SEND_RECORDING_DOWNLOAD_LINK";
    this.calEvent = calEvent;
    this.downloadLink = downloadLink;
    this.t = this.calEvent.organizer.language.translate;
  }
  protected getNodeMailerPayload(): Record<string, unknown> {
    return {
      to: `${this.calEvent.organizer.email}>`,
      from: `${APP_NAME} <${this.getMailerOptions().from}>`,
      replyTo: [...this.calEvent.attendees.map(({ email }) => email), this.calEvent.organizer.email],
      subject: `${this.t("download_recording_subject", {
        title: this.calEvent.title,
        date: this.getFormattedDate(),
      })}`,
      html: renderEmail("DailyVideoDownloadRecordingEmail", {
        title: this.calEvent.title,
        date: this.getFormattedDate(),
        downloadLink: this.downloadLink,
        language: this.t,
        name: this.calEvent.organizer.name,
      }),
    };
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
