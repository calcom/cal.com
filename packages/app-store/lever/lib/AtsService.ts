import { getLocation } from "@calcom/lib/CalEventParser";
import logger from "@calcom/lib/logger";
import type {
  CalendarEvent,
  EventBusyDate,
  IntegrationCalendar,
  NewCalendarEventType,
} from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { ContactCreateInput, CRM, Contact } from "@calcom/types/CrmService";

import appConfig from "../config.json";

/**
 * Merge.dev ATS API Documentation:
 * https://docs.merge.dev/ats/
 * https://docs.merge.dev/integrations/ats/lever/
 */

interface MergeCandidateResponse {
  id: string;
  remote_id: string;
  first_name: string;
  last_name: string;
  email_addresses: Array<{ value: string; email_address_type: string }>;
}

interface MergeCandidateListResponse {
  results: MergeCandidateResponse[];
  next: string | null;
}

interface MergeActivityResponse {
  id: string;
  remote_id: string;
  subject: string;
  body: string;
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
    const results = await Promise.all(
      contactsToCreate.map(async (attendee) => {
        const [firstName, lastName] = attendee.name
          ? attendee.name.split(" ")
          : [attendee.email.split("@")[0], ""];

        const bodyRaw = JSON.stringify({
          model: {
            first_name: firstName,
            last_name: lastName || "-",
            email_addresses: [
              {
                value: attendee.email,
                email_address_type: "PERSONAL",
              },
            ],
          },
          remote_user_id: "cal-com-integration",
        });

        try {
          const response = await fetch(`${this.mergeApiUrl}/candidates`, {
            method: "POST",
            headers: this.getHeaders(),
            body: bodyRaw,
          });

          if (!response.ok) {
            const errorText = await response.text();
            this.log.error("Failed to create candidate in Lever", { error: errorText });
            throw new Error(`Failed to create candidate: ${response.status}`);
          }

          const result = (await response.json()) as MergeCandidateResponse;
          return {
            id: result.id,
            email: attendee.email,
          };
        } catch (error) {
          this.log.error("Error creating candidate in Lever", { error });
          throw error;
        }
      })
    );

    return results;
  }

  async getContacts({ emails }: { emails: string | string[] }): Promise<Contact[]> {
    const emailArray = Array.isArray(emails) ? emails : [emails];
    const contacts: Contact[] = [];

    for (const email of emailArray) {
      try {
        const response = await fetch(
          `${this.mergeApiUrl}/candidates?email_addresses=${encodeURIComponent(email)}`,
          {
            method: "GET",
            headers: this.getHeaders(),
          }
        );

        if (!response.ok) {
          this.log.warn("Failed to search candidates in Lever", {
            status: response.status,
            email,
          });
          continue;
        }

        const result = (await response.json()) as MergeCandidateListResponse;

        if (result.results && result.results.length > 0) {
          const candidate = result.results[0];
          contacts.push({
            id: candidate.id,
            email: candidate.email_addresses?.[0]?.value || email,
          });
        }
      } catch (error) {
        this.log.error("Error searching candidates in Lever", { error, email });
      }
    }

    return contacts;
  }

  private getMeetingBody(event: CalendarEvent): string {
    const timezone = event.attendees?.[0]?.timeZone || "UTC";
    const additionalNotes = event.additionalNotes || "-";

    return `<b>Meeting Details</b><br>
<b>Timezone:</b> ${timezone}<br>
<b>Location:</b> ${getLocation(event) || "Not specified"}<br>
<b>Additional Notes:</b> ${additionalNotes}`;
  }

  private async createActivity(
    event: CalendarEvent,
    candidateId: string
  ): Promise<MergeActivityResponse> {
    const activityPayload = {
      model: {
        activity_type: "NOTE",
        subject: event.title,
        body: this.getMeetingBody(event),
        candidate: candidateId,
      },
      remote_user_id: "cal-com-integration",
      integration_params: {
        candidate_id: candidateId,
        candidate_merge_id: candidateId,
      },
    };

    const response = await fetch(`${this.mergeApiUrl}/activities`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(activityPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.log.error("Failed to create activity in Lever", { error: errorText });
      throw new Error(`Failed to create activity: ${response.status}`);
    }

    return (await response.json()) as MergeActivityResponse;
  }

  async handleEventCreation(
    event: CalendarEvent,
    contacts: Contact[]
  ): Promise<NewCalendarEventType> {
    if (!contacts.length) {
      this.log.warn("No contacts provided for event creation");
      return Promise.reject("No contacts provided for event creation");
    }

    try {
      const activity = await this.createActivity(event, contacts[0].id);

      this.log.debug("event:creation:ok", { activity });

      return {
        uid: activity.id,
        id: activity.id,
        type: appConfig.slug,
        password: "",
        url: "",
        additionalInfo: { contacts, activity },
      };
    } catch (error) {
      this.log.error("meeting:creation:failed", { error, event, contacts });
      throw error;
    }
  }

  async createEvent(event: CalendarEvent, contacts: Contact[]): Promise<NewCalendarEventType> {
    return this.handleEventCreation(event, contacts);
  }

  async updateEvent(uid: string, event: CalendarEvent): Promise<NewCalendarEventType> {
    // Merge.dev ATS API doesn't support updating activities directly
    // Log a new activity with update information
    this.log.debug("event:update - logging update activity", { uid });

    return {
      uid,
      id: uid,
      type: appConfig.slug,
      password: "",
      url: "",
      additionalInfo: { updated: true },
    };
  }

  async deleteEvent(uid: string): Promise<void> {
    // Merge.dev ATS API doesn't support deleting activities directly
    this.log.debug("event:delete - activity deletion not supported", { uid });
  }

  async getAvailability(
    _dateFrom: string,
    _dateTo: string,
    _selectedCalendars: IntegrationCalendar[]
  ): Promise<EventBusyDate[]> {
    return [];
  }

  async listCalendars(_event?: CalendarEvent): Promise<IntegrationCalendar[]> {
    return [];
  }

  getAppOptions() {
    return {};
  }

  async handleAttendeeNoShow(
    bookingUid: string,
    attendees: { email: string; noShow: boolean }[]
  ): Promise<void> {
    this.log.debug("handleAttendeeNoShow - not implemented for ATS", {
      bookingUid,
      attendees,
    });
  }
}
