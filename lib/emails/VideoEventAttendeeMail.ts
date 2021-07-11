import { CalendarEvent } from "../calendarClient";
import EventAttendeeMail from "./EventAttendeeMail";
import { getFormattedMeetingId, getIntegrationName } from "./helpers";
import { VideoCallData } from "../videoClient";
import { EmailTemplate } from "@prisma/client";

export default class VideoEventAttendeeMail extends EventAttendeeMail {
  videoCallData: VideoCallData;

  constructor(
    calEvent: CalendarEvent,
    uid: string,
    videoCallData: VideoCallData,
    emailTemplates: EmailTemplate[] = []
  ) {
    super(calEvent, uid);
    this.videoCallData = videoCallData;
    this.emailTemplates = emailTemplates;
  }

  /**
   * Adds the video call information to the mail body.
   *
   * @protected
   */
  public getAdditionalBody(): string {
    return `
      <strong>Video call provider:</strong> ${getIntegrationName(this.videoCallData)}<br />
      <strong>Meeting ID:</strong> ${getFormattedMeetingId(this.videoCallData)}<br />
      <strong>Meeting Password:</strong> ${this.videoCallData.password}<br />
      <strong>Meeting URL:</strong> <a href="${this.videoCallData.url}">${this.videoCallData.url}</a><br />
    `;
  }
}
