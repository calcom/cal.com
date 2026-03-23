import crypto from "crypto";
import axios from "axios";

interface BBBCredentials {
  serverUrl: string;
  sharedSecret: string;
}

interface BBBMeetingParams {
  meetingID: string;
  name: string;
  moderatorPW: string;
  attendeePW: string;
  welcome?: string;
  logoutURL?: string;
  maxParticipants?: number;
}

interface BBBJoinParams {
  meetingID: string;
  fullName: string;
  password: string;
  userID?: string;
  role?: "moderator" | "viewer";
}

export class BBBApi {
  private serverUrl: string;
  private sharedSecret: string;

  constructor(credentials: BBBCredentials) {
    // Ensure server URL doesn't end with slash
    this.serverUrl = credentials.serverUrl.replace(/\/+$/, "");
    this.sharedSecret = credentials.sharedSecret;
  }

  /**
   * Generate SHA-256 checksum for BBB API authentication
   */
  private generateChecksum(queryString: string): string {
    const checksumString = queryString + this.sharedSecret;
    return crypto.createHash("sha256").update(checksumString).digest("hex");
  }

  /**
   * Build authenticated BBB API URL
   */
  private buildApiUrl(apiCall: string, params: Record<string, any>): string {
    // Remove undefined/null values and convert to string
    const cleanParams = Object.entries(params)
      .filter(([_, value]) => value !== undefined && value !== null)
      .reduce((acc, [key, value]) => {
        acc[key] = String(value);
        return acc;
      }, {} as Record<string, string>);

    // Build query string
    const queryString = new URLSearchParams(cleanParams).toString();
    
    // Generate checksum
    const checksum = this.generateChecksum(apiCall + queryString);
    
    // Build final URL
    return `${this.serverUrl}/bigbluebutton/api/${apiCall}?${queryString}&checksum=${checksum}`;
  }

  /**
   * Create a BigBlueButton meeting
   */
  async createMeeting(params: BBBMeetingParams): Promise<void> {
    const apiParams = {
      meetingID: params.meetingID,
      name: params.name,
      moderatorPW: params.moderatorPW,
      attendeePW: params.attendeePW,
      welcome: params.welcome || `Welcome to ${params.name}!`,
      logoutURL: params.logoutURL,
      maxParticipants: params.maxParticipants || 100,
      autoStartRecording: false,
      allowStartStopRecording: false,
      record: false,
      duration: 0, // No time limit
    };

    const url = this.buildApiUrl("create", apiParams);
    
    try {
      const response = await axios.get(url, {
        timeout: 10000, // 10 second timeout
      });

      // BBB returns XML, check for errors
      if (response.data.includes("<returncode>FAILED</returncode>")) {
        const messageMatch = response.data.match(/<message>(.*?)<\/message>/);
        const message = messageMatch ? messageMatch[1] : "Failed to create meeting";
        throw new Error(`BBB API Error: ${message}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to create BBB meeting: ${error.message}`);
      }
      throw new Error("Failed to create BBB meeting");
    }
  }

  /**
   * Generate join URL for a participant
   */
  getJoinUrl(params: BBBJoinParams): string {
    const apiParams = {
      meetingID: params.meetingID,
      fullName: params.fullName,
      password: params.password,
      userID: params.userID,
      redirect: "true", // Redirect immediately to meeting
    };

    return this.buildApiUrl("join", apiParams);
  }

  /**
   * End a BigBlueButton meeting
   */
  async endMeeting(meetingID: string, moderatorPassword: string): Promise<void> {
    const apiParams = {
      meetingID,
      password: moderatorPassword,
    };

    const url = this.buildApiUrl("end", apiParams);
    
    try {
      const response = await axios.get(url, {
        timeout: 10000,
      });

      if (response.data.includes("<returncode>FAILED</returncode>")) {
        const messageMatch = response.data.match(/<message>(.*?)<\/message>/);
        const message = messageMatch ? messageMatch[1] : "Failed to end meeting";
        throw new Error(`BBB API Error: ${message}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to end BBB meeting: ${error.message}`);
      }
      throw new Error("Failed to end BBB meeting");
    }
  }

  /**
   * Test connection to BBB server and validate authentication
   * Uses getMeetings which requires a valid checksum (shared secret)
   */
  async testConnection(): Promise<boolean> {
    try {
      const url = this.buildApiUrl("getMeetings", {});
      const response = await axios.get(url, {
        timeout: 5000,
      });

      // A successful auth returns SUCCESS or an empty meetings list, never FAILED
      if (response.status !== 200) return false;
      return !response.data.includes("<returncode>FAILED</returncode>");
    } catch (error) {
      return false;
    }
  }
}