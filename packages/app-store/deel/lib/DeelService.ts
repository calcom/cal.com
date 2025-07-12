import type { Credential } from "@prisma/client";

import logger from "@calcom/lib/logger";

import type { DeelToken } from "../api/callback";

export interface DeelTimeOffRequest {
  recipient_profile_id: string;
  start_date: string;
  end_date: string;
  time_off_type_id: string;
  notes?: string;
}

export interface DeelTimeOffResponse {
  id: string;
  recipient_profile_id: string;
  start_date: string;
  end_date: string;
  time_off_type_id: string;
  status: string;
  notes?: string;
}

export interface DeelTimeOffType {
  id: string;
  name: string;
}

export interface DeelPolicy {
  id: string;
  name: string;
  time_off_types: DeelTimeOffType[];
}

export interface DeelPoliciesResponse {
  data: DeelPolicy[];
}

export class DeelService {
  private credential: Credential;
  private log: typeof logger;

  constructor(credential: Credential) {
    this.credential = credential;
    this.log = logger.getSubLogger({ prefix: [`[[lib] DeelService`] });
  }

  private async getAccessToken(): Promise<string> {
    const key = this.credential.key as unknown as DeelToken;

    if (key.expiryDate && Date.now() >= key.expiryDate) {
      throw new Error("Deel access token expired");
    }

    return key.access_token;
  }

  async createTimeOff(request: DeelTimeOffRequest): Promise<DeelTimeOffResponse> {
    try {
      const accessToken = await this.getAccessToken();

      const response = await fetch("https://api.letsdeel.com/rest/v2/time_offs", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.log.error("Failed to create Deel time-off request", {
          status: response.status,
          error: errorText,
        });
        throw new Error(`Deel API error: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      this.log.info("Successfully created Deel time-off request", { id: result.id });
      return result;
    } catch (error) {
      this.log.error("Error creating Deel time-off request", error);
      throw error;
    }
  }

  async getRecipientProfileId(userEmail: string): Promise<string | null> {
    try {
      const accessToken = await this.getAccessToken();

      const response = await fetch(
        `https://api.letsdeel.com/rest/v2/people?email=${encodeURIComponent(userEmail)}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        this.log.warn("Could not find Deel employee", { email: userEmail, status: response.status });
        return null;
      }

      const data = await response.json();
      return data.data?.[0]?.id || null;
    } catch (error) {
      this.log.error("Error getting Deel recipient profile ID", error);
      return null;
    }
  }

  async getTimeOffTypeId(recipientProfileId: string): Promise<string | null> {
    try {
      const accessToken = await this.getAccessToken();

      const response = await fetch(
        `https://api.letsdeel.com/rest/v2/time_offs/profile/${encodeURIComponent(
          recipientProfileId
        )}/policies`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        this.log.warn("Could not fetch Deel policies", {
          profileId: recipientProfileId,
          status: response.status,
        });
        return null;
      }

      const data: DeelPoliciesResponse = await response.json();

      for (const policy of data.data || []) {
        for (const timeOffType of policy.time_off_types || []) {
          if (
            timeOffType.name?.toLowerCase().includes("vacation") ||
            timeOffType.name?.toLowerCase().includes("pto") ||
            timeOffType.name?.toLowerCase().includes("time off")
          ) {
            return timeOffType.id;
          }
        }
      }

      return data.data?.[0]?.time_off_types?.[0]?.id || null;
    } catch (error) {
      this.log.error("Error getting Deel time-off type ID", error);
      return null;
    }
  }
}
