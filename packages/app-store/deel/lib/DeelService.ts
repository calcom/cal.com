import type { Credential } from "@prisma/client";

import logger from "@calcom/lib/logger";

import type { DeelToken } from "../api/callback";

export interface DeelTimeOffRequest {
  employee_id: string;
  start_date: string;
  end_date: string;
  time_off_type: string;
  notes?: string;
}

export interface DeelTimeOffResponse {
  id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  time_off_type: string;
  status: string;
  notes?: string;
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

  async getEmployeeId(userEmail: string): Promise<string | null> {
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
      this.log.error("Error getting Deel employee ID", error);
      return null;
    }
  }
}
