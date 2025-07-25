import { v4 as uuid } from "uuid";

import { CalendarAuth } from "@calcom/app-store/googlecalendar/lib/CalendarAuth";
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

const ONE_MONTH_IN_MS = 30 * 24 * 60 * 60 * 1000;
// eslint-disable-next-line turbo/no-undeclared-env-vars -- GOOGLE_WEBHOOK_URL only for local testing
const GOOGLE_WEBHOOK_URL_BASE = process.env.GOOGLE_WEBHOOK_URL || process.env.NEXT_PUBLIC_WEBAPP_URL;
const GOOGLE_WEBHOOK_URL = `${GOOGLE_WEBHOOK_URL_BASE}/api/webhook/google-calendar-sql`;

export class CalendarSubscriptionService implements ICalendarSubscriptionService {
  async watchCalendar(
    calendarId: string,
    credential: CredentialForCalendarService
  ): Promise<GoogleChannelProps | undefined> {
    log.debug("watchCalendar", safeStringify({ calendarId }));

    if (!process.env.GOOGLE_WEBHOOK_TOKEN) {
      log.warn("GOOGLE_WEBHOOK_TOKEN is not set, skipping watching calendar");
      return;
    }

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

      const calendarAuth = new CalendarAuth(credentialWithEmail);
      const calendar = await calendarAuth.getClient();

      log.debug(`Subscribing to calendar ${calendarId}`, safeStringify({ GOOGLE_WEBHOOK_URL }));

      const res = await calendar.events.watch({
        calendarId,
        requestBody: {
          id: uuid(),
          type: "web_hook",
          address: GOOGLE_WEBHOOK_URL,
          token: process.env.GOOGLE_WEBHOOK_TOKEN,
          params: {
            ttl: `${Math.round(ONE_MONTH_IN_MS / 1000)}`,
          },
        },
      });

      return {
        kind: res.data.kind || null,
        id: res.data.id || null,
        resourceId: res.data.resourceId || null,
        resourceUri: res.data.resourceUri || null,
        expiration: res.data.expiration || null,
      };
    } catch (error) {
      log.error(`Failed to watch calendar ${calendarId}`, safeStringify(error));
      throw error;
    }
  }

  async unwatchCalendar(calendarId: string, credential: CredentialForCalendarService): Promise<void> {
    log.debug("unwatchCalendar", safeStringify({ calendarId }));

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

      const calendarAuth = new CalendarAuth(credentialWithEmail);
      const calendar = await calendarAuth.getClient();

      log.info(`Unwatch calendar ${calendarId} - channel cleanup should be handled by repository layer`);
    } catch (error) {
      log.error(`Failed to unwatch calendar ${calendarId}`, safeStringify(error));
      throw error;
    }
  }
}
