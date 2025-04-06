import { JWT } from "googleapis-common";

import { GoogleAdminDirectoryService } from "./GoogleAdminDirectoryService";

export interface MeetSpace {
  name: string;
  meetingCode: string;
  meetingUri: string;
}

export interface MeetParticipant {
  name: string;
  email?: string;
  signedinUser?: {
    user: string;
  };
}

export interface MeetConferenceRecord {
  name: string;
  startTime: string;
  endTime: string;
  space: string;
  expireTime: string;
}

export class GoogleMeetService {
  private auth: JWT;
  private baseUrl = "https://meet.googleapis.com/v2";
  private adminDirectoryService: GoogleAdminDirectoryService;
  private accessToken: string | null = null;
  private tokenExpiry: number | null = null;

  constructor(credentials: { client_email: string; private_key: string }, emailToImpersonate: string) {
    this.auth = new JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: [
        "https://www.googleapis.com/auth/calendar",
        "https://www.googleapis.com/auth/meetings.space.readonly",
        "https://www.googleapis.com/auth/admin.directory.user.readonly",
      ],
      universeDomain: "googleapis.com",
      subject: emailToImpersonate,
    });
    this.adminDirectoryService = new GoogleAdminDirectoryService(this.auth);
  }

  // Make sure to call this before making any requests
  async authorize() {
    await this.auth.authorize();
  }

  private async getAccessToken(): Promise<string> {
    // If we have a valid token, return it
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const { token } = await this.auth.getAccessToken();
    if (!token) {
      throw new Error("Failed to get access token");
    }
    this.accessToken = token;
    this.tokenExpiry = this.auth.credentials.expiry_date || null;
    return token;
  }

  private async makeRequest<T>(endpoint: string, method = "GET"): Promise<T> {
    const token = await this.getAccessToken();
    console.log("token", token);
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Google Meet API request failed: ${response.statusText}`);
    }

    return response.json();
  }

  async getSpace(meetingCode: string): Promise<MeetSpace> {
    return this.makeRequest<MeetSpace>(`/spaces/${meetingCode}`);
  }

  async getConferenceRecord(conferenceRecordId: string) {
    return this.makeRequest(`/conferenceRecords/${conferenceRecordId}`);
  }

  async listConferenceRecordsAsync() {
    return this.makeRequest<{ conferenceRecords: MeetConferenceRecord[] }>("/conferenceRecords").then(
      (response) => response.conferenceRecords
    );
  }

  async listConferenceRecordsByMeetingCode(meetingCode: string) {
    return this.makeRequest<{ conferenceRecords: MeetConferenceRecord[] }>(
      `/conferenceRecords?filter=space.meeting_code="${meetingCode}"`
    ).then((response) => response.conferenceRecords);
  }

  async getParticipants(conferenceRecordId: string): Promise<MeetParticipant[]> {
    return this.makeRequest<{ participants: MeetParticipant[] }>(`/${conferenceRecordId}/participants`).then(
      (response) => response.participants
    );
  }

  async getUser(userId: string) {
    return this.adminDirectoryService.getUser(userId);
  }
}
