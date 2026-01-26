import z from "zod";

import type { SendgridNewContact } from "@calcom/lib/Sendgrid";
import Sendgrid from "@calcom/lib/Sendgrid";
import { symmetricDecrypt } from "@calcom/lib/crypto";
import logger from "@calcom/lib/logger";
import type {
  Calendar,
  CalendarEvent,
  EventBusyDate,
  GetAvailabilityParams,
  IntegrationCalendar,
  NewCalendarEventType,
} from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";

const apiKeySchema = z.object({
  encrypted: z.string(),
});

const CALENDSO_ENCRYPTION_KEY = process.env.CALENDSO_ENCRYPTION_KEY || "";

/**
 * Authentication
 * Sendgrid requires Basic Auth for any request to their APIs, which is far from
 * ideal considering that such a strategy requires generating an API Key by the
 * user and input it in our system. A Setup page was created when trying to install
 * Sendgrid in order to instruct how to create such resource and to obtain it.
 */
class SendgridCalendarService implements Calendar {
  private integrationName = "";
  private sendgrid: Sendgrid;
  private log: typeof logger;

  constructor(credential: CredentialPayload) {
    this.integrationName = "sendgrid_other_calendar";
    this.log = logger.getSubLogger({ prefix: [`[[lib] ${this.integrationName}`] });

    const parsedCredentialKey = apiKeySchema.safeParse(credential.key);

    let decrypted;
    if (parsedCredentialKey.success) {
      decrypted = symmetricDecrypt(parsedCredentialKey.data.encrypted, CALENDSO_ENCRYPTION_KEY);
      const { api_key } = JSON.parse(decrypted);
      this.sendgrid = new Sendgrid(api_key);
    } else {
      throw Error(
        `No API Key found for userId ${credential.userId} and appId ${credential.appId}: ${parsedCredentialKey.error}`
      );
    }
  }

  async createEvent(event: CalendarEvent): Promise<NewCalendarEventType> {
    // Proceeding to just creating the user in Sendgrid, no event entity exists in Sendgrid
    const contactsData = event.attendees.map((attendee) => ({
      first_name: attendee.name,
      email: attendee.email,
    }));
    const result = await this.sendgrid.sendgridRequest<SendgridNewContact>({
      url: `/v3/marketing/contacts`,
      method: "PUT",
      body: {
        contacts: contactsData,
      },
    });
    return Promise.resolve({
      id: "",
      uid: result.job_id,
      password: "",
      url: "",
      type: this.integrationName,
      additionalInfo: {
        result,
      },
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async updateEvent(_uid: string, _event: CalendarEvent): Promise<any> {
    // Unless we want to be able to support modifying an event to add more attendees
    // to have them created in Sendgrid, ignoring this use case for now
    return Promise.resolve();
  }

  async deleteEvent(_uid: string): Promise<void> {
    // Unless we want to delete the contact in Sendgrid once the event
    // is deleted just ignoring this use case for now
    return Promise.resolve();
  }

  async getAvailability(_params: GetAvailabilityParams): Promise<EventBusyDate[]> {
    return Promise.resolve([]);
  }

  async listCalendars(_event?: CalendarEvent): Promise<IntegrationCalendar[]> {
    return Promise.resolve([]);
  }
}

/**
 * Factory function that creates a Sendgrid Calendar service instance.
 * This is exported instead of the class to prevent internal types
 * from leaking into the emitted .d.ts file.
 */
export default function BuildCalendarService(credential: CredentialPayload): Calendar {
  return new SendgridCalendarService(credential);
}
