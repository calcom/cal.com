import z from "zod";

import logger from "@calcom/lib/logger";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { CRM, ContactCreateInput, CrmEvent, Contact } from "@calcom/types/CrmService";

const API_BASE_URL = "https://api.lever.co/v1";

const credentialSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
  expires_at: z.number().optional(),
});

/**
 * Lever.co CRM Service
 *
 * Lever uses OAuth2 for authentication.
 * The API provides endpoints for managing opportunities, candidates, and notes.
 *
 * When a booking is created through Cal.com, this service creates an
 * opportunity note in Lever to track the scheduled interview.
 *
 * Lever API docs: https://hire.lever.co/developer/documentation
 */
class LeverCoCrmService implements CRM {
  private integrationName = "leverco_crm";
  private accessToken: string;
  private log: typeof logger;

  constructor(credential: CredentialPayload) {
    this.log = logger.getSubLogger({ prefix: [`[[lib] ${this.integrationName}`] });

    const parsedKey = credentialSchema.safeParse(credential.key);

    if (!parsedKey.success) {
      throw new Error(
        `Invalid credentials for userId ${credential.userId} and appId ${credential.appId}: ${parsedKey.error}`
      );
    }

    this.accessToken = parsedKey.data.access_token;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.log.error(`Lever API error: ${response.status} ${errorText}`);
      throw new Error(`Lever API request failed: ${response.status}`);
    }

    return response.json();
  }

  async createEvent(event: CalendarEvent, contacts: Contact[]): Promise<CrmEvent> {
    // For each contact that has a Lever opportunity ID, create a note on the opportunity
    // to track the scheduled interview
    const contactIds = contacts.map((contact) => contact.id);

    for (const contactId of contactIds) {
      try {
        const noteBody = this.formatEventAsNote(event);
        await this.request(`/opportunities/${contactId}/notes`, {
          method: "POST",
          body: JSON.stringify({
            value: noteBody,
          }),
        });
      } catch (error) {
        this.log.error(`Failed to create note for opportunity ${contactId}`, error);
      }
    }

    return {
      id: contactIds[0] || "",
      uid: event.uid,
      type: this.integrationName,
      password: "",
      url: "",
    };
  }

  async updateEvent(uid: string, event: CalendarEvent): Promise<CrmEvent> {
    // Lever notes cannot be updated via API, so we add a new note with updated info
    try {
      const noteBody = this.formatEventAsNote(event, true);
      await this.request(`/opportunities/${uid}/notes`, {
        method: "POST",
        body: JSON.stringify({
          value: noteBody,
        }),
      });
    } catch (error) {
      this.log.error(`Failed to update note for opportunity ${uid}`, error);
    }

    return {
      id: uid,
    };
  }

  async deleteEvent(uid: string, _event: CalendarEvent): Promise<void> {
    // Lever notes cannot be individually deleted via API
    // We add a cancellation note instead
    try {
      await this.request(`/opportunities/${uid}/notes`, {
        method: "POST",
        body: JSON.stringify({
          value: "[Cal.com] Interview booking has been cancelled.",
        }),
      });
    } catch (error) {
      this.log.error(`Failed to add cancellation note for opportunity ${uid}`, error);
    }
  }

  async getContacts({
    emails,
  }: {
    emails: string | string[];
    includeOwner?: boolean;
    forRoundRobinSkip?: boolean;
  }): Promise<Contact[]> {
    const emailList = Array.isArray(emails) ? emails : [emails];
    const contacts: Contact[] = [];

    for (const email of emailList) {
      try {
        // Search for opportunities by email
        const response = await this.request(`/opportunities?email=${encodeURIComponent(email)}`);

        if (response.data && response.data.length > 0) {
          for (const opportunity of response.data) {
            contacts.push({
              id: opportunity.id,
              email: email,
            });
          }
        }
      } catch (error) {
        this.log.error(`Failed to search for contact ${email} in Lever`, error);
      }
    }

    return contacts;
  }

  async createContacts(contactsToCreate: ContactCreateInput[]): Promise<Contact[]> {
    const contacts: Contact[] = [];

    for (const contactInput of contactsToCreate) {
      try {
        // Create an opportunity (candidate) in Lever
        const response = await this.request("/opportunities", {
          method: "POST",
          body: JSON.stringify({
            name: contactInput.name,
            emails: [contactInput.email],
            phones: contactInput.phone ? [{ value: contactInput.phone }] : [],
            tags: ["cal.com"],
          }),
        });

        if (response.data) {
          contacts.push({
            id: response.data.id,
            email: contactInput.email,
          });
        }
      } catch (error) {
        this.log.error(`Failed to create opportunity for ${contactInput.email} in Lever`, error);
      }
    }

    return contacts;
  }

  getAppOptions() {
    // No configurable options for Lever integration
  }

  async handleAttendeeNoShow(
    bookingUid: string,
    attendees: { email: string; noShow: boolean }[]
  ): Promise<void> {
    // Add a note about no-shows to the relevant opportunities
    for (const attendee of attendees) {
      if (!attendee.noShow) continue;

      try {
        const contacts = await this.getContacts({ emails: attendee.email });
        for (const contact of contacts) {
          await this.request(`/opportunities/${contact.id}/notes`, {
            method: "POST",
            body: JSON.stringify({
              value: `[Cal.com] Attendee ${attendee.email} was marked as a no-show for booking ${bookingUid}.`,
            }),
          });
        }
      } catch (error) {
        this.log.error(`Failed to record no-show for ${attendee.email} in Lever`, error);
      }
    }
  }

  private formatEventAsNote(event: CalendarEvent, isUpdate = false): string {
    const prefix = isUpdate ? "[Cal.com] Updated Interview" : "[Cal.com] Interview Scheduled";
    const startTime = event.startTime ? new Date(event.startTime).toISOString() : "N/A";
    const endTime = event.endTime ? new Date(event.endTime).toISOString() : "N/A";
    const organizer = event.organizer?.name || event.organizer?.email || "Unknown";
    const attendees =
      event.attendees?.map((a) => `${a.name || ""} (${a.email})`).join(", ") || "None";

    const parts = [
      prefix,
      `Title: ${event.title || "N/A"}`,
      `Date: ${startTime} - ${endTime}`,
      `Organizer: ${organizer}`,
      `Attendees: ${attendees}`,
    ];

    if (event.additionalNotes) {
      parts.push(`Notes: ${event.additionalNotes}`);
    }

    return parts.join("\n");
  }
}

/**
 * Factory function that creates a Lever.co CRM service instance.
 */
export default function BuildCrmService(
  credential: CredentialPayload,
  _appOptions?: Record<string, unknown>
): CRM {
  return new LeverCoCrmService(credential);
}
