import { getLocation } from "@calcom/lib/CalEventParser";
import logger from "@calcom/lib/logger";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { ContactCreateInput, CRM, Contact, CrmEvent } from "@calcom/types/CrmService";

import appConfig from "../config.json";

/**
 * Merge.dev ATS API Documentation:
 * https://docs.merge.dev/ats/
 * https://docs.merge.dev/integrations/ats/lever/
 */

interface MergeCandidateResponse {
  id: string;
  email_addresses: Array<{ value: string }>;
}

interface MergeCandidateListResponse {
  results: MergeCandidateResponse[];
}

interface MergeActivityResponse {
  id: string;
}

export default class LeverAtsService implements CRM {
  private log: typeof logger;
  private accountToken: string;
  private mergeApiKey: string;
  private mergeApiUrl: string;

  constructor(credential: CredentialPayload) {
    this.mergeApiKey = process.env.MERGE_API_KEY || "";
    this.mergeApiUrl = "https://api.merge.dev/api/ats/v1";
    this.accountToken = (credential.key as { account_token?: string })?.account_token || "";
    this.log = logger.getSubLogger({ prefix: [`[lib] ${appConfig.slug}`] });
  }

  private getHeaders(): Headers {
    const headers = new Headers();
    headers.append("Authorization", `Bearer ${this.mergeApiKey}`);
    headers.append("X-Account-Token", this.accountToken);
    headers.append("Content-Type", "application/json");
    return headers;
  }

  async createContacts(contactsToCreate: ContactCreateInput[]): Promise<Contact[]> {
    return Promise.all(
      contactsToCreate.map(async (attendee) => {
        const [firstName, lastName] = attendee.name?.split(" ") ?? [attendee.email.split("@")[0], ""];

        const response = await fetch(`${this.mergeApiUrl}/candidates`, {
          method: "POST",
          headers: this.getHeaders(),
          body: JSON.stringify({
            model: {
              first_name: firstName,
              last_name: lastName || "-",
              email_addresses: [{ value: attendee.email, email_address_type: "PERSONAL" }],
            },
            remote_user_id: "cal-com-integration",
          }),
        });

        if (!response.ok) {
          this.log.error("Failed to create candidate in Lever", { status: response.status });
          throw new Error(`Failed to create candidate: ${response.status}`);
        }

        const result = (await response.json()) as MergeCandidateResponse;
        return { id: result.id, email: attendee.email };
      })
    );
  }

  async getContacts({ emails }: { emails: string | string[] }): Promise<Contact[]> {
    const emailArray = Array.isArray(emails) ? emails : [emails];

    const results = await Promise.all(
      emailArray.map(async (email): Promise<Contact | null> => {
        try {
          const response = await fetch(
            `${this.mergeApiUrl}/candidates?email_addresses=${encodeURIComponent(email)}`,
            { method: "GET", headers: this.getHeaders() }
          );

          if (!response.ok) {
            this.log.warn("Failed to search candidates in Lever", { status: response.status });
            return null;
          }

          const result = (await response.json()) as MergeCandidateListResponse;
          const candidate = result.results?.[0];
          return candidate ? { id: candidate.id, email: candidate.email_addresses?.[0]?.value || email } : null;
        } catch (error) {
          this.log.error("Error searching candidates in Lever", { });
          return null;
        }
      })
    );

    return results.filter((c): c is Contact => c !== null);
  }

  private getMeetingBody(event: CalendarEvent): string {
    const timezone = event.attendees?.[0]?.timeZone || "UTC";
    return `<b>Meeting:</b> ${event.title}<br><b>Timezone:</b> ${timezone}<br><b>Location:</b> ${getLocation(event) || "N/A"}<br><b>Notes:</b> ${event.additionalNotes || "-"}`;
  }

  private async createActivity(event: CalendarEvent, candidateId: string): Promise<MergeActivityResponse> {
    const response = await fetch(`${this.mergeApiUrl}/activities`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        model: {
          activity_type: "NOTE",
          subject: event.title,
          body: this.getMeetingBody(event),
          candidate: candidateId,
        },
        remote_user_id: "cal-com-integration",
      }),
    });

    if (!response.ok) {
      this.log.error("Failed to create activity in Lever", { status: response.status });
      throw new Error(`Failed to create activity: ${response.status}`);
    }

    return (await response.json()) as MergeActivityResponse;
  }

  async createEvent(event: CalendarEvent, contacts: Contact[]): Promise<CrmEvent | undefined> {
    if (!contacts.length) {
      this.log.warn("No contacts provided for event creation");
      return undefined;
    }

    const activity = await this.createActivity(event, contacts[0].id);
    this.log.debug("event:creation:ok", { activityId: activity.id });

    return {
      id: activity.id,
      uid: activity.id,
      type: appConfig.slug,
      additionalInfo: { contacts, activity },
    };
  }

  async updateEvent(uid: string, _event: CalendarEvent): Promise<CrmEvent> {
    // Merge.dev ATS API doesn't support updating activities
    this.log.debug("event:update - not supported", { uid });
    return { id: uid, uid, type: appConfig.slug };
  }

  async deleteEvent(uid: string, _event: CalendarEvent): Promise<void> {
    // Merge.dev ATS API doesn't support deleting activities
    this.log.debug("event:delete - not supported", { uid });
  }

  getAppOptions() {
    return {};
  }
}
