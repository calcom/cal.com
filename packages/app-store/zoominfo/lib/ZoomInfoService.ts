import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import refreshOAuthTokens from "../../_utils/oauth/refreshOAuthTokens";
import type { ZoomInfoToken } from "../api/callback";
import type { ZoomInfoEnrichedData } from "../zod";

const log = logger.getSubLogger({ prefix: ["[ZoomInfoService]"] });

interface ZoomInfoContactEnrichResponse {
  success: boolean;
  data?: {
    result?: Array<{
      data?: Array<{
        id?: string;
        firstName?: string;
        lastName?: string;
        email?: string;
        phone?: string;
        jobTitle?: string;
        jobFunction?: string;
        managementLevel?: string;
        linkedInUrl?: string;
        company?: {
          id?: string;
          name?: string;
          website?: string;
          industry?: string;
          revenue?: string;
          employeeCount?: number;
          city?: string;
          state?: string;
          country?: string;
        };
      }>;
    }>;
  };
}

interface ZoomInfoServiceDeps {
  credentialId: number;
  credentialKey: Prisma.JsonValue;
  userId: number | null;
}

class ZoomInfoService {
  private accessToken: string | null = null;
  private credentialId: number;
  private credentialKey: Prisma.JsonValue;
  private userId: number | null;

  constructor(deps: ZoomInfoServiceDeps) {
    this.credentialId = deps.credentialId;
    this.credentialKey = deps.credentialKey;
    this.userId = deps.userId;
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken) {
      return this.accessToken;
    }

    const credentialKey = this.credentialKey as unknown as ZoomInfoToken;

    if (!credentialKey.access_token) {
      throw new Error("ZoomInfo access token not found in credentials");
    }

    const isTokenValid = credentialKey.expiryDate && credentialKey.expiryDate > Date.now();

    if (isTokenValid) {
      this.accessToken = credentialKey.access_token;
      return this.accessToken;
    }

    const refreshedToken = await this.refreshAccessToken(credentialKey.refresh_token);
    this.accessToken = refreshedToken.access_token;
    return this.accessToken;
  }

  private async refreshAccessToken(refreshToken: string): Promise<ZoomInfoToken> {
    const appKeys = await getAppKeysFromSlug("zoominfo");
    const clientId = appKeys.client_id as string;
    const clientSecret = appKeys.client_secret as string;

    if (!clientId || !clientSecret) {
      throw new Error("ZoomInfo client credentials not configured");
    }

    const refreshedToken: ZoomInfoToken = await refreshOAuthTokens(
      async () => {
        const response = await fetch("https://api.zoominfo.com/oauth/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: refreshToken,
            client_id: clientId,
            client_secret: clientSecret,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to refresh ZoomInfo token: ${await response.text()}`);
        }

        return response.json();
      },
      "zoominfo",
      this.userId
    );

    refreshedToken.expiryDate = Math.round(Date.now() + refreshedToken.expires_in * 1000);

    await prisma.credential.update({
      where: { id: this.credentialId },
      data: { key: refreshedToken as unknown as Prisma.InputJsonValue },
    });

    this.credentialKey = refreshedToken as unknown as Prisma.JsonValue;

    return refreshedToken;
  }

  async enrichContact(email: string): Promise<ZoomInfoEnrichedData | null> {
    try {
      const accessToken = await this.getAccessToken();

      const response = await fetch("https://api.zoominfo.com/gtm/data/v1/contacts/enrich", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          matchPersonInput: [{ emailAddress: email }],
          outputFields: [
            "id",
            "firstName",
            "lastName",
            "email",
            "phone",
            "jobTitle",
            "jobFunction",
            "managementLevel",
            "linkedInUrl",
            "company.id",
            "company.name",
            "company.website",
            "company.industry",
            "company.revenue",
            "company.employeeCount",
            "company.city",
            "company.state",
            "company.country",
          ],
        }),
      });

      if (!response.ok) {
        log.error(`ZoomInfo API error: ${response.status} ${await response.text()}`);
        return null;
      }

      const result: ZoomInfoContactEnrichResponse = await response.json();

      if (!result.success || !result.data?.result?.[0]?.data?.[0]) {
        log.info(`No ZoomInfo data found for email: ${email}`);
        return null;
      }

      const contact = result.data.result[0].data[0];
      const company = contact.company;

      const enrichedData: ZoomInfoEnrichedData = {
        contactId: contact.id,
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        phone: contact.phone,
        jobTitle: contact.jobTitle,
        jobFunction: contact.jobFunction,
        managementLevel: contact.managementLevel,
        linkedInUrl: contact.linkedInUrl,
        companyId: company?.id,
        companyName: company?.name,
        companyWebsite: company?.website,
        companyIndustry: company?.industry,
        companyRevenue: company?.revenue,
        companyEmployeeCount: company?.employeeCount,
        companyCity: company?.city,
        companyState: company?.state,
        companyCountry: company?.country,
        enrichedAt: new Date().toISOString(),
      };

      return enrichedData;
    } catch (error) {
      log.error("Error enriching contact with ZoomInfo", error);
      return null;
    }
  }

  async enrichContacts(emails: string[]): Promise<Map<string, ZoomInfoEnrichedData>> {
    const enrichedDataMap = new Map<string, ZoomInfoEnrichedData>();

    for (const email of emails) {
      const enrichedData = await this.enrichContact(email);
      if (enrichedData) {
        enrichedDataMap.set(email.toLowerCase(), enrichedData);
      }
    }

    return enrichedDataMap;
  }
}

export default ZoomInfoService;
export type { ZoomInfoServiceDeps };
