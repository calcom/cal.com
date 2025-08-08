import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { CredentialForCalendarService } from "@calcom/types/Credential";

import type { ICalendarEventRepository } from "./CalendarEventRepository.interface";
import type { ICalendarSubscriptionRepository } from "./CalendarSubscriptionRepository.interface";

const log = logger.getSubLogger({ prefix: ["CalendarWebhookServiceFactory"] });

export interface ICalendarWebhookService {
  processWebhookEvents(subscription: any, credential: CredentialForCalendarService): Promise<void>;
}

interface CalendarWebhookApp {
  CalendarWebhookService: new (
    subscriptionRepo: ICalendarSubscriptionRepository,
    eventRepo: ICalendarEventRepository
  ) => ICalendarWebhookService;
}

const isCalendarWebhookService = (x: unknown): x is CalendarWebhookApp =>
  !!x &&
  typeof x === "object" &&
  "CalendarWebhookService" in x &&
  typeof (x as any).CalendarWebhookService === "function";

export class CalendarWebhookServiceFactory {
  private static async getServiceModule(credentialType: string): Promise<CalendarWebhookApp> {
    let importPath: string;

    switch (credentialType) {
      case "office365_calendar":
        importPath = "@calcom/app-store/office365calendar/lib/CalendarWebhookService";
        break;
      case "google_calendar":
      default:
        importPath = "@calcom/app-store/googlecalendar/lib/CalendarWebhookService";
        break;
    }

    const serviceModule = await import(importPath);

    if (!isCalendarWebhookService(serviceModule)) {
      throw new Error(`Invalid calendar webhook service for type ${credentialType}`);
    }

    return serviceModule;
  }

  static async createService(
    credential: CredentialForCalendarService,
    subscriptionRepo: ICalendarSubscriptionRepository,
    eventRepo: ICalendarEventRepository
  ): Promise<ICalendarWebhookService> {
    log.debug("Creating calendar webhook service", safeStringify({ type: credential.type }));

    try {
      const serviceModule = await this.getServiceModule(credential.type);
      return new serviceModule.CalendarWebhookService(subscriptionRepo, eventRepo);
    } catch (error) {
      log.error(`Failed to create calendar webhook service for ${credential.type}`, safeStringify(error));
      throw error;
    }
  }
}
