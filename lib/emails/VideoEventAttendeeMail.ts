import EventAttendeeMail from "./EventAttendeeMail";
import { getFormattedMeetingId, getIntegrationName } from "./helpers";

export default class VideoEventAttendeeMail extends EventAttendeeMail {
  /**
   * Adds the video call information to the mail body.
   *
   * @protected
   */
  protected getAdditionalBody(): string {
    if (!this.calEvent.videoCallData) {
      return "";
    }
    const meetingPassword = this.calEvent.videoCallData.password;
    const meetingId = getFormattedMeetingId(this.calEvent.videoCallData);

    if (meetingId && meetingPassword) {
      return `
      <strong>${this.calEvent.language("video_call_provider")}:</strong> ${getIntegrationName(
        this.calEvent.videoCallData
      )}<br />
      <strong>${this.calEvent.language("meeting_id")}:</strong> ${getFormattedMeetingId(
        this.calEvent.videoCallData
      )}<br />
      <strong>${this.calEvent.language("meeting_password")}:</strong> ${
        this.calEvent.videoCallData.password
      }<br />
      <strong>${this.calEvent.language("meeting_url")}:</strong> <a href="${
        this.calEvent.videoCallData.url
      }">${this.calEvent.videoCallData.url}</a><br />
    `;
    }

    return `
      <strong>${this.calEvent.language("video_call_provider")}:</strong> ${getIntegrationName(
      this.calEvent.videoCallData
    )}<br />
      <strong>${this.calEvent.language("meeting_url")}:</strong> <a href="${
      this.calEvent.videoCallData.url
    }">${this.calEvent.videoCallData.url}</a><br />
    `;
  }
}
