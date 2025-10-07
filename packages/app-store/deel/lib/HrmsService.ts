import logger from "@calcom/lib/logger";
import { CredentialRepository } from "@calcom/lib/server/repository/credential";
import prisma from "@calcom/prisma";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { HrmsService } from "@calcom/types/HrmsService";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import type { DeelToken } from "../api/callback";
import { deelApiUrl, deelAuthUrl } from "../lib/constants";
import { appKeysSchema } from "../zod";

export interface DeelPerson {
  id: string;
  emails: {
    type: string | null;
    value: string | null;
  }[];
  full_name: string;
  worker_id: string;
}

export enum DeelTimeOffStatus {
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  REQUESTED = "REQUESTED",
}

export interface DeelTimeOffRequest {
  recipient_profile_id: string;
  start_date: string;
  end_date: string;
  time_off_type_id: string;
  description?: string;
  status: DeelTimeOffStatus;
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

class DeelHrmsService implements HrmsService {
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

      await CredentialRepository.updateCredentialById({
        id: this.credential.id,
        data: {
          key: refreshedToken,
        },
      });

      return refreshedToken.access_token;
    }

    return key.access_token;
  }

  private async refreshToken(refreshToken: string): Promise<DeelToken> {
    const appKeys = await getAppKeysFromSlug("deel");
    const { client_id, client_secret } = appKeysSchema.parse(appKeys);

    const response = await fetch(`${deelAuthUrl}/oauth2/tokens`, {
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
    startDate: string;
    endDate: string;
    userEmail: string;
    notes?: string;
    externalReasonId: string;
  }): Promise<{ id: string }> {
    try {
      const accessToken = await this.getAccessToken();

      const recipientProfileId = await this.getRecipientProfileId(params.userEmail);
      if (!recipientProfileId) {
        this.log.error("Recipient profile ID not found for user", { email: params.userEmail });
        throw new Error(`Recipient profile ID not found for user: ${params.userEmail}`);
      }

      const request: DeelTimeOffRequest = {
        recipient_profile_id: recipientProfileId,
        start_date: params.startDate,
        end_date: params.endDate,
        time_off_type_id: params.externalReasonId,
        description: params.notes,
        status: DeelTimeOffStatus.APPROVED,
      };

      const response = await fetch(`${deelApiUrl}/rest/v2/time_offs`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data: request }),
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
      const externalId = result.timeOffs[0]?.id;
      this.log.info("Successfully created Deel time-off request", { id: externalId });
      return { id: externalId };
    } catch (error) {
      this.log.error("Error creating Deel time-off request", error);
      throw error;
    }
  }

  async updateOOO(
    externalId: string,
    params: {
      startDate?: string;
      endDate?: string;
      notes?: string;
      externalReasonId?: string;
      userEmail: string;
    }
  ): Promise<void> {
    try {
      const accessToken = await this.getAccessToken();

      const recipientProfileId = await this.getRecipientProfileId(params.userEmail);
      if (!recipientProfileId) {
        this.log.error("Recipient profile ID not found for user", { email: params.userEmail });
        throw new Error(`Recipient profile ID not found for user: ${params.userEmail}`);
      }

      const request: Partial<DeelTimeOffRequest> = {};
      request.recipient_profile_id = recipientProfileId;
      if (params.startDate) request.start_date = params.startDate;
      if (params.endDate) request.end_date = params.endDate;
      if (params.notes) request.description = params.notes;
      if (params.externalReasonId) request.time_off_type_id = params.externalReasonId;

      const response = await fetch(`${deelApiUrl}/rest/v2/time_offs/${encodeURIComponent(externalId)}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data: request }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.log.error("Failed to update Deel time-off request", {
          externalId,
          status: response.status,
          error: errorText,
        });
        throw new Error(`Deel API error: ${response.status} ${errorText}`);
      }

      this.log.info("Successfully updated Deel time-off request", { id: externalId });
    } catch (error) {
      this.log.error("Error updating Deel time-off request", error);
      throw error;
    }
  }

  async deleteOOO(externalId: string): Promise<void> {
    try {
      const accessToken = await this.getAccessToken();

      const response = await fetch(`${deelApiUrl}/rest/v2/time_offs/${encodeURIComponent(externalId)}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.log.error("Failed to delete Deel time-off request", {
          externalId,
          status: response.status,
          error: errorText,
        });
        throw new Error(`Deel API error: ${response.status} ${errorText}`);
      }

      this.log.info("Successfully deleted Deel time-off request", { id: externalId });
    } catch (error) {
      this.log.error("Error deleting Deel time-off request", error);
      throw error;
    }
  }

  async listOOOReasons(
    userEmail: string | null,
    profileId?: string
  ): Promise<{ id: number; name: string; externalId: string }[]> {
    try {
      if (!userEmail && !profileId) {
        this.log.warn("listOOOReasons: Missing both userEmail and hrisProfileId parameters");
        return [];
      }

      let hrisProfileId: string | null | undefined = profileId;

      if (!profileId && userEmail) {
        hrisProfileId = await this.getRecipientProfileId(userEmail);
        if (!hrisProfileId) {
          this.log.warn("listOOOReasons: Recipient profile ID not found for user", { email: userEmail });
          return [];
        }
      }

      if (!hrisProfileId) {
        this.log.warn("listOOOReasons: Unable to determine profile ID from provided parameters");
        return [];
      }

      const accessToken = await this.getAccessToken();
      const response = await fetch(
        `${deelApiUrl}/rest/v2/time_offs/profile/${encodeURIComponent(hrisProfileId)}/policies`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        this.log.warn("listOOOReasons: Failed to fetch Deel policies", {
          profileId,
          status: response.status,
        });
        return [];
      }

      const data: DeelPoliciesResponse = await response.json();

      if (!data.policies?.length) {
        this.log.info("listOOOReasons: No policies found for profile", {
          hrisProfileId,
        });
        return [];
      }

      const reasonsPromises = data.policies.flatMap((policy) =>
        (policy.time_off_types || []).map((timeOffType) =>
          prisma.outOfOfficeReason
            .upsert({
              where: {
                credentialId_externalId: {
                  credentialId: this.credential.id,
                  externalId: timeOffType.id,
                },
              },
              create: {
                reason: timeOffType.name,
                credentialId: this.credential.id,
                externalId: timeOffType.id,
              },
              update: {
                reason: timeOffType.name,
              },
            })
            .then((reason) => ({
              externalId: timeOffType.id,
              name: timeOffType.name,
              id: reason.id,
            }))
        )
      );

      const reasons = await Promise.all(reasonsPromises);

      this.log.info("Successfully fetched and upserted Deel OOO reasons", {
        count: reasons.length,
        profileId,
      });

      return reasons;
    } catch (error) {
      this.log.error("listOOOReasons: Error fetching Deel OOO reasons", error);
      return [];
    }
  }

  async getRecipientProfileId(userEmail: string): Promise<string | null> {
    try {
      const accessToken = await this.getAccessToken();

      const response = await fetch(`${deelApiUrl}/rest/v2/people?search=${encodeURIComponent(userEmail)}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        this.log.warn("Could not find Deel person", { email: userEmail, status: response.status });
        return null;
      }

      const data = await response.json();
      const person = data.data?.find((person: DeelPerson) =>
        person.emails.some((email) => email.value?.toLowerCase() === userEmail.toLowerCase())
      );
      return person?.id || null;
    } catch (error) {
      this.log.error("Error getting Deel recipient profile ID", error);
      return null;
    }
  }

  async getPersonById(personId: string): Promise<DeelPerson | null> {
    try {
      const accessToken = await this.getAccessToken();

      const response = await fetch(`${deelApiUrl}/rest/v2/people/${encodeURIComponent(personId)}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        this.log.warn("Could not fetch Deel person by ID", { personId, status: response.status });
        return null;
      }

      const data = await response.json();
      return data as DeelPerson;
    } catch (error) {
      this.log.error("Error getting Deel person by ID", error);
      return null;
    }
  }
}

export { DeelHrmsService };
