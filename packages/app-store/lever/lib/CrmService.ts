import { getLocation } from "@calcom/lib/CalEventParser";
import logger from "@calcom/lib/logger";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { ContactCreateInput, CRM, Contact, CrmEvent } from "@calcom/types/CrmService";

import appConfig from "../config.json";

// =============================================================================
// Lever ATS Integration via Merge.dev
// =============================================================================
//
// Connects Cal.com with Lever ATS through Merge.dev unified API.
//
// Flow:
// 1. User installs app -> Merge Link OAuth -> account_token stored
// 2. Booking created -> Search for attendee in Lever by email
// 3. If not found -> Create new candidate with attendee details
// 4. Log meeting as NOTE activity on candidate profile
//
// Authentication:
// - MERGE_API_KEY: Environment variable (Merge.dev API key)
// - account_token: Per-user OAuth token (stored in credential.key)
//
// Docs: https://docs.merge.dev/integrations/ats/lever/
// =============================================================================

const MERGE_API_BASE_URL = "https://api.merge.dev/api/ats/v1";
const INTEGRATION_USER_ID = "cal-com-integration";

// Merge.dev API response types
interface MergeCandidate {
  id: string;
  email_addresses: Array<{ value: string; email_address_type?: string }>;
}

interface MergeCandidateListResponse {
  results: MergeCandidate[];
}

interface MergeActivity {
  id: string;
}

/**
 * Parses name into first/last components. Falls back to email username.
 */
function parseContactName(name: string | undefined, email: string) {
  if (name?.trim()) {
    const parts = name.trim().split(/s+/);
    return { firstName: parts[0], lastName: parts.slice(1).join(" ") || "-" };
  }
  return { firstName: email.split("@")[0], lastName: "-" };
}

/**
 * Formats event details as HTML for Lever activity notes.
 */
function formatActivityBody(event: CalendarEvent): string {
  const tz = event.attendees?.[0]?.timeZone || "UTC";
  const loc = getLocation(event) || "Not specified";
  return `<b>Meeting:</b> ${event.title}<br><b>Timezone:</b> ${tz}<br><b>Location:</b> ${loc}<br><b>Notes:</b> ${event.additionalNotes || "None"}`;
}

/**
 * Lever CRM service using Merge.dev unified ATS API.
 *
 * Syncs Cal.com bookings with Lever by creating candidates and
 * logging meeting activities to their profiles.
 */
export default class LeverCrmService implements CRM {
  private readonly log: typeof logger;
  private readonly accountToken: string;
  private readonly apiKey: string;

  constructor(credential: CredentialPayload) {
    this.apiKey = process.env.MERGE_API_KEY || "";
    this.accountToken = (credential.key as { account_token?: string })?.account_token || "";
    this.log = logger.getSubLogger({ prefix: ["[lever]"] });
  }

  private getHeaders(): HeadersInit {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "X-Account-Token": this.accountToken,
      "Content-Type": "application/json",
    };
  }

  /** Creates candidates in Lever for provided contacts. */
  async createContacts(contacts: ContactCreateInput[]): Promise<Contact[]> {
    return Promise.all(
      contacts.map(async (contact) => {
        const { firstName, lastName } = parseContactName(contact.name, contact.email);

        const res = await fetch(`${MERGE_API_BASE_URL}/candidates`, {
          method: "POST",
          headers: this.getHeaders(),
          body: JSON.stringify({
            model: {
              first_name: firstName,
              last_name: lastName,
              email_addresses: [{ value: contact.email, email_address_type: "PERSONAL" }],
            },
            remote_user_id: INTEGRATION_USER_ID,
          }),
        });

        if (!res.ok) {
          this.log.error("Failed to create candidate", { status: res.status });
          throw new Error(`Lever API error: ${res.status}`);
        }

        const candidate = (await res.json()) as MergeCandidate;
        return { id: candidate.id, email: contact.email };
      })
    );
  }

  /** Searches for candidates in Lever by email. */
  async getContacts({ emails }: { emails: string | string[] }): Promise<Contact[]> {
    const emailList = Array.isArray(emails) ? emails : [emails];

    const results = await Promise.all(
      emailList.map(async (email): Promise<Contact | null> => {
        try {
          const res = await fetch(
            `${MERGE_API_BASE_URL}/candidates?email_addresses=${encodeURIComponent(email)}`,
            { method: "GET", headers: this.getHeaders() }
          );

          if (!res.ok) return null;

          const data = (await res.json()) as MergeCandidateListResponse;
          const c = data.results?.[0];
          return c ? { id: c.id, email: c.email_addresses?.[0]?.value || email } : null;
        } catch {
          return null;
        }
      })
    );

    return results.filter((c): c is Contact => c !== null);
  }

  /** Creates meeting activity in Lever for primary contact. */
  async createEvent(event: CalendarEvent, contacts: Contact[]): Promise<CrmEvent | undefined> {
    if (!contacts.length) return undefined;

    const res = await fetch(`${MERGE_API_BASE_URL}/activities`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        model: {
          activity_type: "NOTE",
          subject: event.title,
          body: formatActivityBody(event),
          candidate: contacts[0].id,
        },
        remote_user_id: INTEGRATION_USER_ID,
      }),
    });

    if (!res.ok) {
      this.log.error("Failed to create activity", { status: res.status });
      throw new Error(`Lever API error: ${res.status}`);
    }

    const activity = (await res.json()) as MergeActivity;
    return { id: activity.id, uid: activity.id, type: appConfig.slug };
  }

  /** No-op: Merge ATS API does not support updates. */
  async updateEvent(uid: string, _event: CalendarEvent): Promise<CrmEvent> {
    return { id: uid, uid, type: appConfig.slug };
  }

  /** No-op: Merge ATS API does not support deletion. */
  async deleteEvent(_uid: string, _event: CalendarEvent): Promise<void> {}

  getAppOptions() {
    return {};
  }
}
