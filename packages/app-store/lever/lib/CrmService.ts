import type { CalendarEvent, CalEventResponses } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { Contact, ContactCreateInput, CRM, CrmEvent } from "@calcom/types/CrmService";

export default class LeverService implements CRM {
  private credential: CredentialPayload;

  constructor(credential: CredentialPayload) {
    this.credential = credential;
  }

  private getApiKey(): string {
    if (typeof this.credential.key === "string") return this.credential.key;
    // biome-ignore lint/suspicious/noExplicitAny: credential key structure
    return (this.credential.key as any)?.apiKey || "";
  }

  private async fetchLever(endpoint: string, method: string, body?: unknown): Promise<unknown> {
    const apiKey = this.getApiKey();
    const headers = {
      Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
      "Content-Type": "application/json",
    };

    const options: RequestInit = {
      method,
      headers,
    };
    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`https://api.lever.co/v1${endpoint}`, options);

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Lever API error: ${response.status} ${response.statusText} - ${text}`);
    }

    return response.json();
  }

  async createEvent(event: CalendarEvent, _contacts: Contact[]): Promise<CrmEvent | undefined> {
    const attendee = event.attendees[0];
    const name = attendee.name;
    const email = attendee.email;

    const body = {
      name,
      emails: [email],
      headline: event.title,
      sources: ["Cal.com"],
      tags: ["Cal.com Booking"],
      createdAt: new Date(event.startTime).getTime(),
    };

    try {
      const result = await this.fetchLever("/opportunities", "POST", body);
      const data = result.data;
      return {
        id: data.id,
        type: "lever_crm",
        url: data.urls?.show,
      };
    } catch (e) {
      console.error("Error creating Lever opportunity", e);
      throw e;
    }
  }

  async updateEvent(uid: string, _event: CalendarEvent): Promise<CrmEvent> {
    // For now, we assume updating the opportunity is not required or can be done via other means.
    // We just return the existing ID data.
    return Promise.resolve({ id: uid, type: "lever_crm" });
  }

  async deleteEvent(_uid: string, _event: CalendarEvent): Promise<void> {
    // Optionally archive the opportunity
    return Promise.resolve();
  }

  async getContacts(
    { emails }: { emails: string | string[] },
    _includeOwner?: boolean,
    _forRoundRobinSkip?: boolean
  ): Promise<Contact[]> {
    let emailArray: string[];
    if (Array.isArray(emails)) {
      emailArray = emails;
    } else {
      emailArray = [emails];
    }
    const contacts: Contact[] = [];

    for (const email of emailArray) {
      try {
        const result = (await this.fetchLever(
          `/opportunities?email=${encodeURIComponent(email)}`,
          "GET"
        )) as { data?: { id: string; name: string }[] };
        if (result.data && Array.isArray(result.data)) {
          for (const opp of result.data) {
            contacts.push({
              id: opp.id,
              email,
              name: opp.name,
            });
          }
        }
      } catch (e) {
        console.error("Error fetching lever contact", e);
      }
    }
    return contacts;
  }

  async createContacts(
    contactsToCreate: ContactCreateInput[],
    _organizerEmail?: string,
    _calEventResponses?: CalEventResponses | null
  ): Promise<Contact[]> {
    const created: Contact[] = [];
    for (const contact of contactsToCreate) {
      let emails: string[] | undefined;
      if (contact.email) {
        emails = [contact.email];
      }
      const body = {
        name: contact.name,
        emails,
        sources: ["Cal.com"],
      };
      try {
        // biome-ignore lint/suspicious/noExplicitAny: response data
        const result = (await this.fetchLever("/opportunities", "POST", body)) as any;
        if (result.data) {
          created.push({
            id: result.data.id,
            email: contact.email || "",
            name: contact.name,
          });
        }
      } catch (e) {
        console.error("Error creating contact in Lever", e);
        throw e;
      }
    }
    return created;
  }

  getAppOptions(): Record<string, unknown> {
    return {};
  }

  async handleAttendeeNoShow(
    _bookingUid: string,
    _attendees: { email: string; noShow: boolean }[]
  ): Promise<void> {
    // Not implemented
  }
}
