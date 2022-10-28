import { Credential } from "@prisma/client";
import z from "zod";

import Sendgrid from "@calcom/lib/Sendgrid";
import { symmetricDecrypt } from "@calcom/lib/crypto";
import logger from "@calcom/lib/logger";
import type {
  Calendar,
  CalendarEvent,
  EventBusyDate,
  IntegrationCalendar,
  NewCalendarEventType,
} from "@calcom/types/Calendar";

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
export default class CloseComCalendarService implements Calendar {
  private integrationName = "";
  private sendgrid: Sendgrid;
  private log: typeof logger;

  constructor(credential: Credential) {
    this.integrationName = "sendgrid_other_calendar";
    this.log = logger.getChildLogger({ prefix: [`[[lib] ${this.integrationName}`] });

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
    // TODO
    return Promise.resolve({
      uid: "",
      id: "",
      type: this.integrationName,
      password: "",
      url: "",
      additionalInfo: {
        //customActivityTypeInstanceData,
      },
    });
  }

  async updateEvent(uid: string, event: CalendarEvent): Promise<any> {
    // We should only proceed to create additional attendees in case more
    // were added to the updated event
    // TODO
  }

  async deleteEvent(uid: string): Promise<void> {
    // Unless we want to delete the contact in Sendgrid once the event
    // is deleted just ingoring this use case for now
    return Promise.resolve();
  }

  async getAvailability(
    dateFrom: string,
    dateTo: string,
    selectedCalendars: IntegrationCalendar[]
  ): Promise<EventBusyDate[]> {
    return Promise.resolve([]);
  }

  async listCalendars(event?: CalendarEvent): Promise<IntegrationCalendar[]> {
    return Promise.resolve([]);
  }
}
