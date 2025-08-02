import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type {
  CredentialForCalendarService,
  CredentialForCalendarServiceWithEmail,
} from "@calcom/types/Credential";

import type {
  GoogleChannelProps,
  ICalendarSubscriptionService,
} from "./CalendarSubscriptionService.interface";

const log = logger.getSubLogger({ prefix: ["CalendarSubscriptionService"] });

export class CalendarSubscriptionService implements ICalendarSubscriptionService {
  async watchCalendar(
    calendarId: string,
    credential: CredentialForCalendarService
  ): Promise<GoogleChannelProps | undefined> {
    log.debug("watchCalendar", safeStringify({ calendarId }));

    try {
      if (credential.delegatedTo && !credential.delegatedTo.serviceAccountKey.client_email) {
        throw new Error("Delegation credential missing required client_email");
      }

      const credentialWithEmail: CredentialForCalendarServiceWithEmail = {
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

      const { CalendarSubscriptionService } = await import(
        "@calcom/app-store/googlecalendar/lib/CalendarSubscriptionService"
      );
      const subscriptionService = new CalendarSubscriptionService(credentialWithEmail);

      return await subscriptionService.watchCalendar(calendarId);
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
      if (credential.delegatedTo && !credential.delegatedTo.serviceAccountKey.client_email) {
        throw new Error("Delegation credential missing required client_email");
      }

      const credentialWithEmail: CredentialForCalendarServiceWithEmail = {
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

      const { CalendarSubscriptionService } = await import(
        "@calcom/app-store/googlecalendar/lib/CalendarSubscriptionService"
      );
      const subscriptionService = new CalendarSubscriptionService(credentialWithEmail);

      await subscriptionService.unwatchCalendar(calendarId, channelId, resourceId);
      log.info(`Successfully unwatched calendar ${calendarId}`);
    } catch (error) {
      log.error(`Failed to unwatch calendar ${calendarId}`, safeStringify(error));
      throw error;
    }
  }
}
