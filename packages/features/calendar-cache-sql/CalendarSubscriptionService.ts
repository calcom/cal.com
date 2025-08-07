import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type {
  CredentialForCalendarService,
  CredentialForCalendarServiceWithEmail,
  CredentialForCalendarServiceWithTenantId,
} from "@calcom/types/Credential";

export type GoogleChannelProps = {
  kind?: string | null;
  id?: string | null;
  resourceId?: string | null;
  resourceUri?: string | null;
  expiration?: string | null;
};

export type Office365SubscriptionProps = {
  id?: string | null;
  resource?: string | null;
  changeType?: string | null;
  expirationDateTime?: string | null;
  notificationUrl?: string | null;
};

const log = logger.getSubLogger({ prefix: ["CalendarSubscriptionService"] });

export class CalendarSubscriptionService {
  private validateAndTransformCredential(
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

  async watchCalendar(
    calendarId: string,
    credential: CredentialForCalendarService
  ): Promise<GoogleChannelProps | Office365SubscriptionProps | undefined> {
    log.debug("watchCalendar", safeStringify({ calendarId }));

    try {
      if (credential.type === "office365_calendar") {
        const credentialWithTenantId = credential as CredentialForCalendarServiceWithTenantId;
        const { CalendarSubscriptionService } = await import(
          "@calcom/app-store/office365calendar/lib/CalendarSubscriptionService"
        );
        const subscriptionService = new CalendarSubscriptionService(credentialWithTenantId);
        return await subscriptionService.watchCalendar(calendarId);
      } else {
        const credentialWithEmail = this.validateAndTransformCredential(credential);
        const { CalendarSubscriptionService } = await import(
          "@calcom/app-store/googlecalendar/lib/CalendarSubscriptionService"
        );
        const subscriptionService = new CalendarSubscriptionService(credentialWithEmail);
        return await subscriptionService.watchCalendar(calendarId);
      }
    } catch (error) {
      log.error(`Failed to watch calendar ${calendarId}`, safeStringify(error));
      throw error;
    }
  }

  async unwatchCalendar(
    calendarId: string,
    credential: CredentialForCalendarService,
    channelId: string,
    resourceId: string
  ): Promise<void> {
    log.debug("unwatchCalendar", safeStringify({ calendarId, channelId, resourceId }));

    try {
      if (credential.type === "office365_calendar") {
        const credentialWithTenantId = credential as CredentialForCalendarServiceWithTenantId;
        const { CalendarSubscriptionService } = await import(
          "@calcom/app-store/office365calendar/lib/CalendarSubscriptionService"
        );
        const subscriptionService = new CalendarSubscriptionService(credentialWithTenantId);
        await subscriptionService.unwatchCalendar(calendarId, channelId);
      } else {
        const credentialWithEmail = this.validateAndTransformCredential(credential);
        const { CalendarSubscriptionService } = await import(
          "@calcom/app-store/googlecalendar/lib/CalendarSubscriptionService"
        );
        const subscriptionService = new CalendarSubscriptionService(credentialWithEmail);
        await subscriptionService.unwatchCalendar(calendarId, channelId, resourceId);
      }
      log.info(`Successfully unwatched calendar ${calendarId}`);
    } catch (error) {
      log.error(`Failed to unwatch calendar ${calendarId}`, safeStringify(error));
      throw error;
    }
  }
}
