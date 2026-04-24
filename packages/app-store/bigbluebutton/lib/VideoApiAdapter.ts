import type { VideoApiAdapter, VideoCallData } from "@calcom/types/VideoApiAdapter";
import type { CredentialPayload } from "@calcom/types/Credential";
import { createHash } from "crypto";

interface BigBlueButtonCredentials {
  url: string;
  secret: string;
}

interface BigBlueButtonMeeting {
  meetingID: string;
  name: string;
  attendeePW: string;
  moderatorPW: string;
  welcome?: string;
  duration?: number;
  moderatorOnlyMessage?: string;
  autoStartRecording?: boolean;
  allowStartStopRecording?: boolean;
}

export default class BigBlueButtonVideoApiAdapter implements VideoApiAdapter {
  private credentials: BigBlueButtonCredentials;

  constructor(credential: CredentialPayload) {
    const parsedCredential = JSON.parse(credential.key?.toString() || "{}");
    this.credentials = {
      url: parsedCredential.url,
      secret: parsedCredential.secret,
    };
  }

  /**
   * Generate checksum for BBB API call
   */
  private generateChecksum(apiCall: string, params: string): string {
    const checksumString = apiCall + params + this.credentials.secret;
    return createHash("sha1").update(checksumString).digest("hex");
  }

  /**
   * Build BBB API URL with checksum
   */
  private buildApiUrl(apiCall: string, params: Record<string, string>): string {
    const queryParams = new URLSearchParams(params).toString();
    const checksum = this.generateChecksum(apiCall, queryParams);
    return `${this.credentials.url}/bigbluebutton/api/${apiCall}?${queryParams}&checksum=${checksum}`;
  }

  /**
   * Create a new BBB meeting
   */
  async createMeeting(event: {
    title: string;
    duration?: number;
    startTime: string;
  }): Promise<VideoCallData> {
    const meetingID = `cal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const attendeePW = `att-${Math.random().toString(36).substr(2, 8)}`;
    const moderatorPW = `mod-${Math.random().toString(36).substr(2, 8)}`;

    const meeting: BigBlueButtonMeeting = {
      meetingID,
      name: event.title,
      attendeePW,
      moderatorPW,
      welcome: "Welcome to the meeting!",
      duration: event.duration,
    };

    const params: Record<string, string> = {
      name: meeting.name,
      meetingID: meeting.meetingID,
      attendeePW: meeting.attendeePW,
      moderatorPW: meeting.moderatorPW,
      welcome: meeting.welcome || "",
    };

    if (meeting.duration) {
      params.duration = meeting.duration.toString();
    }

    const url = this.buildApiUrl("create", params);

    try {
      const response = await fetch(url);
      const text = await response.text();

      if (!response.ok) {
        throw new Error(`BBB API error: ${text}`);
      }

      // Parse XML response
      const returncode = text.match(/<returncode>(.+?)<\/returncode>/)?.[1];
      if (returncode !== "SUCCESS") {
        const message = text.match(/<message>(.+?)<\/message>/)?.[1] || "Unknown error";
        throw new Error(`BBB create meeting failed: ${message}`);
      }

      // Generate join URLs
      const hostUrl = this.getJoinUrl(meetingID, moderatorPW, "Host");
      const attendeeUrl = this.getJoinUrl(meetingID, attendeePW, "Attendee");

      return {
        type: "bigbluebutton_video",
        id: meetingID,
        password: attendeePW,
        url: attendeeUrl,
        hostUrl,
        attendeeUrl,
      };
    } catch (error) {
      console.error("Failed to create BBB meeting:", error);
      throw error;
    }
  }

  /**
   * Update an existing meeting (BBB doesn't support true updates, so we create new)
   */
  async updateMeeting(
    meetingId: string,
    event: {
      title: string;
      duration?: number;
      startTime: string;
    }
  ): Promise<VideoCallData> {
    // BigBlueButton doesn't support updating meetings
    // We create a new one instead
    return this.createMeeting(event);
  }

  /**
   * Delete/end a meeting
   */
  async deleteMeeting(meetingId: string): Promise<void> {
    // Get meeting info to find moderator password
    // For simplicity, we just end the meeting if we have the password
    // In production, you'd store the moderator password
    console.log(`Meeting ${meetingId} will expire naturally`);
  }

  /**
   * Get meeting info
   */
  async getMeeting(meetingId: string): Promise<VideoCallData> {
    // This would fetch meeting info from BBB
    // For now, return basic structure
    return {
      type: "bigbluebutton_video",
      id: meetingId,
      password: "",
      url: "",
    };
  }

  /**
   * Generate join URL for a participant
   */
  private getJoinUrl(meetingID: string, password: string, fullName: string): string {
    const params: Record<string, string> = {
      fullName,
      meetingID,
      password,
      redirect: "true",
    };

    return this.buildApiUrl("join", params);
  }

  /**
   * Check if BBB server is available
   */
  async checkServerStatus(): Promise<boolean> {
    try {
      const url = this.buildApiUrl("getMeetings", {});
      const response = await fetch(url, { method: "GET" });
      return response.ok;
    } catch {
      return false;
    }
  }
}
