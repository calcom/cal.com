import { getLocation } from "@calcom/lib/CalEventParser";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { ContactCreateInput, CRM, Contact, CrmEvent } from "@calcom/types/CrmService";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import refreshOAuthTokens from "../../_utils/oauth/refreshOAuthTokens";
import type { LeverToken } from "../api/callback";

const LEVER_API_BASE = "https://api.lever.co/v1";

interface LeverOpportunity {
  id: string;
  emails?: string[];
  name?: string;
}

interface LeverOpportunitiesResponse {
  data: LeverOpportunity[];
}

interface LeverNote {
  id: string;
  text: string;
}

function formatNoteBody(event: CalendarEvent): string {
  const tz = event.attendees?.[0]?.timeZone || "UTC";
  const loc = getLocation(event) || "Not specified";
  const startTime = new Date(event.startTime).toLocaleString("en-US", { timeZone: tz });
  const endTime = new Date(event.endTime).toLocaleString("en-US", { timeZone: tz });

  return [
    `Meeting: ${event.title}`,
    `Time: ${startTime} - ${endTime} (${tz})`,
    `Location: ${loc}`,
    event.additionalNotes ? `Notes: ${event.additionalNotes}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export default class LeverCrmService implements CRM {
  private log: typeof logger;
  private auth: Promise<{ getToken: () => Promise<string> }>;
  private clientId = "";
  private clientSecret = "";

  constructor(private credential: CredentialPayload) {
    this.log = logger.getSubLogger({ prefix: ["[lever]"] });
    this.auth = this.leverAuth(credential);
  }

  private leverAuth = async (credential: CredentialPayload) => {
    const appKeys = await getAppKeysFromSlug("lever");
    if (typeof appKeys.client_id === "string") this.clientId = appKeys.client_id;
    if (typeof appKeys.client_secret === "string") this.clientSecret = appKeys.client_secret;

    if (!this.clientId) throw new HttpError({ statusCode: 400, message: "Lever client_id missing." });
    if (!this.clientSecret) throw new HttpError({ statusCode: 400, message: "Lever client_secret missing." });

    let currentToken = credential.key as unknown as LeverToken;

    const isTokenValid = (token: LeverToken) =>
      token && token.access_token && token.expiryDate && token.expiryDate > Date.now();

    const refreshAccessToken = async (refreshToken: string) => {
      const response: LeverToken = await refreshOAuthTokens(
        async () => {
          const res = await fetch("https://auth.lever.co/oauth/token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              grant_type: "refresh_token",
              refresh_token: refreshToken,
              client_id: this.clientId,
              client_secret: this.clientSecret,
            }),
          });

          if (!res.ok) {
            throw new Error(`Lever token refresh failed: ${res.status}`);
          }

          return res.json();
        },
        "lever",
        credential.userId
      );

      response.expiryDate = Math.round(Date.now() + response.expires_in * 1000);

      await prisma.credential.update({
        where: { id: credential.id },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: { key: response as any },
      });

      currentToken = response;
    };

    return {
      getToken: async () => {
        if (!isTokenValid(currentToken)) {
          await refreshAccessToken(currentToken.refresh_token);
        }
        return currentToken.access_token;
      },
    };
  };

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = await (await this.auth).getToken();

    const res = await fetch(`${LEVER_API_BASE}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!res.ok) {
      this.log.error("Lever API error", { path, status: res.status });
      throw new Error(`Lever API error: ${res.status}`);
    }

    return res.json();
  }

  async getContacts({ emails }: { emails: string | string[] }): Promise<Contact[]> {
    const emailList = Array.isArray(emails) ? emails : [emails];

    const results = await Promise.all(
      emailList.map(async (email): Promise<Contact | null> => {
        try {
          const response = await this.request<LeverOpportunitiesResponse>(
            `/opportunities?email=${encodeURIComponent(email)}`
          );

          const opp = response.data?.[0];
          if (opp) {
            return { id: opp.id, email: opp.emails?.[0] || email };
          }
          return null;
        } catch {
          return null;
        }
      })
    );

    return results.filter((c): c is Contact => c !== null);
  }

  async createContacts(contacts: ContactCreateInput[]): Promise<Contact[]> {
    return Promise.all(
      contacts.map(async (contact) => {
        const response = await this.request<{ data: LeverOpportunity }>("/opportunities", {
          method: "POST",
          body: JSON.stringify({
            name: contact.name || contact.email.split("@")[0],
            emails: [contact.email],
            sources: ["Cal.com"],
          }),
        });

        return { id: response.data.id, email: contact.email };
      })
    );
  }

  async createEvent(event: CalendarEvent, contacts: Contact[]): Promise<CrmEvent | undefined> {
    if (!contacts.length) return undefined;

    const opportunityId = contacts[0].id;

    const response = await this.request<{ data: LeverNote }>(`/opportunities/${opportunityId}/notes`, {
      method: "POST",
      body: JSON.stringify({
        value: formatNoteBody(event),
      }),
    });

    return { id: response.data.id, uid: response.data.id, type: "lever_crm" };
  }

  async updateEvent(uid: string, _event: CalendarEvent): Promise<CrmEvent> {
    // Lever notes can be updated but we keep it simple
    return { id: uid, uid, type: "lever_crm" };
  }

  async deleteEvent(_uid: string, _event: CalendarEvent): Promise<void> {
    // Lever notes created via API can be deleted but we don't track which note to delete
  }

  getAppOptions() {
    return {};
  }
}
