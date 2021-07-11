import { CalendarEvent } from "../calendarClient";
import EventOrganizerMail from "./EventOrganizerMail";
import { VideoCallData } from "../videoClient";
import { getFormattedMeetingId, getIntegrationName } from "./helpers";

export default class VideoEventOrganizerMail extends EventOrganizerMail {
  videoCallData: VideoCallData;

  constructor(calEvent: CalendarEvent, uid: string, videoCallData: VideoCallData) {
    super(calEvent, uid);
    this.videoCallData = videoCallData;
  }

  /**
   * Adds the video call information to the mail body
   * and calendar event description.
   *
   * @protected
   */
  protected getAdditionalBody(): string {
    // This odd indentation is necessary because otherwise the leading tabs will be applied into the event description.
    return `
<strong>Video call provider:</strong> ${getIntegrationName(this.videoCallData)}<br />
<strong>Meeting ID:</strong> ${getFormattedMeetingId(this.videoCallData)}<br />
<strong>Meeting Password:</strong> ${this.videoCallData.password}<br />
<strong>Meeting URL:</strong> <a href="${this.videoCallData.url}">${this.videoCallData.url}</a><br />
    `;
  }
}
