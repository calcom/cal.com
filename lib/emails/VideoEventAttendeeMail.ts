import {VideoCallData} from "./confirm-booked";
import {CalendarEvent} from "../calendarClient";
import EventAttendeeMail from "./EventAttendeeMail";

export default class VideoEventAttendeeMail extends EventAttendeeMail {
  videoCallData: VideoCallData;

  constructor(calEvent: CalendarEvent, uid: string, videoCallData: VideoCallData) {
    super(calEvent, uid);
    this.videoCallData = videoCallData;
  }

  private getIntegrationName(): string {
    //TODO: When there are more complex integration type strings, we should consider using an extra field in the DB for that.
    const nameProto = this.videoCallData.type.split("_")[0];
    return nameProto.charAt(0).toUpperCase() + nameProto.slice(1);
  }

  private getFormattedMeetingId(): string {
    switch(this.videoCallData.type) {
      case 'zoom_video':
        const strId = this.videoCallData.id.toString();
        const part1 = strId.slice(0, 3);
        const part2 = strId.slice(3, 7);
        const part3 = strId.slice(7, 11);
        return part1 + " " + part2 + " " + part3;
      default:
        return this.videoCallData.id.toString();
    }
  }

  /**
   * Adds the video call information to the mail body.
   *
   * @protected
   */
  protected getAdditionalBody(): string {
    return `
      <strong>Video call provider:</strong> ${this.getIntegrationName()}<br />
      <strong>Meeting ID:</strong> ${this.getFormattedMeetingId()}<br />
      <strong>Meeting Password:</strong> ${this.videoCallData.password}<br />
      <strong>Meeting URL:</strong> <a href="${this.videoCallData.url}">${this.videoCallData.url}</a><br />
    `;
  }
}