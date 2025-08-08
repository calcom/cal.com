import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type {
  CredentialForCalendarService,
  CredentialForCalendarServiceWithEmail,
  CredentialForCalendarServiceWithTenantId,
} from "@calcom/types/Credential";

import type { GoogleChannelProps, Office365SubscriptionProps } from "./CalendarSubscriptionService";

const log = logger.getSubLogger({ prefix: ["CalendarSubscriptionServiceFactory"] });

export interface ICalendarSubscriptionService {
  watchCalendar(calendarId: string): Promise<GoogleChannelProps | Office365SubscriptionProps>;
  unwatchCalendar(calendarId: string, subscriptionId: string, resourceId?: string): Promise<void>;
}

interface CalendarSubscriptionApp {
  CalendarSubscriptionService: new (credential: any) => ICalendarSubscriptionService;
}

const isCalendarSubscriptionService = (x: unknown): x is CalendarSubscriptionApp =>
  !!x &&
  typeof x === "object" &&
  "CalendarSubscriptionService" in x &&
  typeof (x as any).CalendarSubscriptionService === "function";

export class CalendarSubscriptionServiceFactory {
  private static validateGoogleCredential(
    credential: CredentialForCalendarService
  ): CredentialForCalendarServiceWithEmail {
    if (credential.delegatedTo && !credential.delegatedTo.serviceAccountKey.client_email) {
      throw new Error("Delegation credential missing required client_email");
    }

    return {
      ...credential,
      delegatedTo: credential.delegatedTo
        ? {
            serviceAccountKey: {
              client_email: credential.delegatedTo.serviceAccountKey.client_email!,
              client_id: credential.delegatedTo.serviceAccountKey.client_id,
              private_key: credential.delegatedTo.serviceAccountKey.private_key,
            },
          }
        : null,
    };
  }

  private static async getServiceModule(credentialType: string): Promise<CalendarSubscriptionApp> {
    let importPath: string;

    switch (credentialType) {
      case "office365_calendar":
        importPath = "@calcom/app-store/office365calendar/lib/CalendarSubscriptionService";
        break;
      case "google_calendar":
      default:
        importPath = "@calcom/app-store/googlecalendar/lib/CalendarSubscriptionService";
        break;
    }

    const serviceModule = await import(importPath);

    if (!isCalendarSubscriptionService(serviceModule)) {
      throw new Error(`Invalid calendar subscription service for type ${credentialType}`);
    }

    return serviceModule;
  }

  static async createService(
    credential: CredentialForCalendarService
  ): Promise<ICalendarSubscriptionService> {
    log.debug("Creating calendar subscription service", safeStringify({ type: credential.type }));

    try {
      const serviceModule = await this.getServiceModule(credential.type);

      if (credential.type === "office365_calendar") {
        const credentialWithTenantId = credential as CredentialForCalendarServiceWithTenantId;
        return new serviceModule.CalendarSubscriptionService(credentialWithTenantId);
      } else {
        const credentialWithEmail = this.validateGoogleCredential(credential);
        return new serviceModule.CalendarSubscriptionService(credentialWithEmail);
      }
    } catch (error) {
      log.error(
        `Failed to create calendar subscription service for ${credential.type}`,
        safeStringify(error)
      );
      throw error;
    }
  }
}
