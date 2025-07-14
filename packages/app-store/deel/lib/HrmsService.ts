import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { HrmsService } from "@calcom/types/HrmsService";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import type { DeelToken } from "../api/callback";
import { appKeysSchema } from "../zod";

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
  policies: DeelPolicy[];
}

export default class DeelHrmsService implements HrmsService {
  private credential: CredentialPayload;
  private log: typeof logger;

  constructor(credential: CredentialPayload) {
    this.credential = credential;
    this.log = logger.getSubLogger({ prefix: [`[[lib] DeelHrmsService`] });
  }

  private async getAccessToken(): Promise<string> {
    const key = this.credential.key as unknown as DeelToken;

    if (key.expiryDate && Date.now() >= key.expiryDate) {
      const refreshedToken = await this.refreshToken(key.refresh_token);

      await prisma.credential.update({
        where: { id: this.credential.id },
        data: { key: refreshedToken },
      });

      return refreshedToken.access_token;
    }

    return key.access_token;
  }

  private async refreshToken(refreshToken: string): Promise<DeelToken> {
    const appKeys = await getAppKeysFromSlug("deel");
    const { client_id, client_secret } = appKeysSchema.parse(appKeys);

    const response = await fetch("https://app.deel.com/oauth2/tokens", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${client_id}:${client_secret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/integrations/deel/callback`,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to refresh Deel token: ${response.status}`);
    }

    const tokenData = await response.json();
    return {
      access_token: tokenData.access_token,
      token_type: tokenData.token_type,
      expires_in: tokenData.expires_in,
      refresh_token: tokenData.refresh_token,
      scope: tokenData.scope,
      expiryDate: Date.now() + tokenData.expires_in * 1000,
    };
  }

  async createOOO(params: {
    recipientProfileId: string;
    startDate: string;
    endDate: string;
    timeOffTypeId: string;
    notes?: string;
  }): Promise<{ id: string }> {
    try {
      const accessToken = await this.getAccessToken();

      const request: DeelTimeOffRequest = {
        recipient_profile_id: params.recipientProfileId,
        start_date: params.startDate,
        end_date: params.endDate,
        time_off_type_id: params.timeOffTypeId,
        notes: params.notes,
      };

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
      return { id: result.id };
    } catch (error) {
      this.log.error("Error creating Deel time-off request", error);
      throw error;
    }
  }

  async updateOOO(
    timeOffId: string,
    params: {
      startDate?: string;
      endDate?: string;
      notes?: string;
    }
  ): Promise<void> {
    try {
      const accessToken = await this.getAccessToken();

      const request: Partial<DeelTimeOffRequest> = {};
      if (params.startDate) request.start_date = params.startDate;
      if (params.endDate) request.end_date = params.endDate;
      if (params.notes) request.notes = params.notes;

      const response = await fetch(
        `https://api.letsdeel.com/rest/v2/time_offs/${encodeURIComponent(timeOffId)}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ data: request }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        this.log.error("Failed to update Deel time-off request", {
          timeOffId,
          status: response.status,
          error: errorText,
        });
        throw new Error(`Deel API error: ${response.status} ${errorText}`);
      }

      this.log.info("Successfully updated Deel time-off request", { id: timeOffId });
    } catch (error) {
      this.log.error("Error updating Deel time-off request", error);
      throw error;
    }
  }

  async deleteOOO(timeOffId: string): Promise<void> {
    try {
      const accessToken = await this.getAccessToken();

      const response = await fetch(
        `https://api.letsdeel.com/rest/v2/time_offs/${encodeURIComponent(timeOffId)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        this.log.error("Failed to delete Deel time-off request", {
          timeOffId,
          status: response.status,
          error: errorText,
        });
        throw new Error(`Deel API error: ${response.status} ${errorText}`);
      }

      this.log.info("Successfully deleted Deel time-off request", { id: timeOffId });
    } catch (error) {
      this.log.error("Error deleting Deel time-off request", error);
      throw error;
    }
  }

  async getRecipientProfileId(userEmail: string): Promise<string | null> {
    try {
      const accessToken = await this.getAccessToken();

      const response = await fetch(
        `https://api.letsdeel.com/rest/v2/people?search=${encodeURIComponent(userEmail)}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        this.log.warn("Could not find Deel person", { email: userEmail, status: response.status });
        return null;
      }

      const data = await response.json();
      const person = data.data?.find((person: any) => person.email === userEmail);
      return person?.id || null;
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

      for (const policy of data.policies || []) {
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

      return data.policies?.[0]?.time_off_types?.[0]?.id || null;
    } catch (error) {
      this.log.error("Error getting Deel time-off type ID", error);
      return null;
    }
  }
}
