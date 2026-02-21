import z from "zod";

import logger from "@calcom/lib/logger";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { CRM, ContactCreateInput, Contact } from "@calcom/types/CrmService";

const credentialSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
  expires_at: z.number().optional(),
});

/**
 * Lever.co CRM Service
 * 
 * Lever provides OAuth2 authentication via Auth0.
 * 
 * This integration allows creating candidates and opportunities in Lever
 * when meetings are scheduled through Cal.com.
 * 
 * API Documentation: https://hire.lever.co/developer/documentation
 */
class LeverCRMService implements CRM {
  private integrationName = "";
  private accessToken: string;
  private log: typeof logger;

  constructor(credential: CredentialPayload) {
    this.integrationName = "lever_other";
    this.log = logger.getSubLogger({ prefix: [`[[lib] ${this.integrationName}`] });

    const parsedKey = credentialSchema.safeParse(credential.key);

    if (!parsedKey.success) {
      throw new Error(
        `Invalid Lever credentials for userId ${credential.userId} and appId ${credential.appId}: ${parsedKey.error}`
      );
    }

    this.accessToken = parsedKey.data.access_token;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const url = `https://api.lever.co/v1${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      // Log only status code and endpoint to avoid leaking PII from error responses
      this.log.error(`Lever API error: ${response.status} on ${endpoint}`);
      throw new Error(`Lever API error: ${response.status}`);
    }

    return response.json();
  }

  async createContact(contactInfo: ContactCreateInput): Promise<Contact> {
    // In Lever, we create a candidate
    const candidate = await this.makeRequest("/candidates", {
      method: "POST",
      body: JSON.stringify({
        name: `${contactInfo.firstName || ""} ${contactInfo.lastName || ""}`.trim(),
        emails: contactInfo.email ? [contactInfo.email] : [],
        phones: contactInfo.phone ? [{ type: "other", value: contactInfo.phone }] : [],
        origin: "other",
        tags: ["cal.com"],
      }),
    });

    return {
      id: candidate.data.id,
      email: contactInfo.email || "",
      firstName: contactInfo.firstName || "",
      lastName: contactInfo.lastName || "",
    };
  }

  async getContacts(emails: string | string[]): Promise<Contact[]> {
    try {
      const emailArray = Array.isArray(emails) ? emails : [emails];
      const contacts: Contact[] = [];

      for (const email of emailArray) {
        const result = await this.makeRequest(`/candidates?email=${encodeURIComponent(email)}`);
        
        if (result.data && result.data.length > 0) {
          const candidate = result.data[0];
          contacts.push({
            id: candidate.id,
            email: candidate.emails?.[0] || email,
            firstName: candidate.name?.split(" ")[0] || "",
            lastName: candidate.name?.split(" ").slice(1).join(" ") || "",
          });
        }
      }

      return contacts;
    } catch (error) {
      this.log.error("Error fetching Lever candidates:", error);
      return [];
    }
  }

  async updateContact(uid: string, contactInfo: ContactCreateInput): Promise<Contact> {
    try {
      const updated = await this.makeRequest(`/candidates/${uid}`, {
        method: "PUT",
        body: JSON.stringify({
          name: `${contactInfo.firstName || ""} ${contactInfo.lastName || ""}`.trim(),
          emails: contactInfo.email ? [contactInfo.email] : undefined,
          phones: contactInfo.phone ? [{ type: "other", value: contactInfo.phone }] : undefined,
        }),
      });

      return {
        id: updated.data.id,
        email: contactInfo.email || "",
        firstName: contactInfo.firstName || "",
        lastName: contactInfo.lastName || "",
      };
    } catch (error) {
      this.log.error("Error updating Lever candidate:", error);
      throw error;
    }
  }

  async deleteContact(uid: string): Promise<void> {
    try {
      await this.makeRequest(`/candidates/${uid}/archive`, {
        method: "POST",
      });
    } catch (error) {
      this.log.error("Error archiving Lever candidate:", error);
    }
  }
}

export default LeverCRMService;
