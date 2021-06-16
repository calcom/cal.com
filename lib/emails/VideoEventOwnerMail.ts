import {CalendarEvent} from "../calendarClient";
import EventOwnerMail from "./EventOwnerMail";
import {formattedId, integrationTypeToName, VideoCallData} from "./confirm-booked";

export default class VideoEventOwnerMail extends EventOwnerMail {
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
    return `
      <strong>Video call provider:</strong> ${integrationTypeToName(this.videoCallData.type)}<br />
      <strong>Meeting ID:</strong> ${formattedId(this.videoCallData)}<br />
      <strong>Meeting Password:</strong> ${this.videoCallData.password}<br />
      <strong>Meeting URL:</strong> <a href="${this.videoCallData.url}">${this.videoCallData.url}</a><br />
    `;
  }
}