import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { CredentialForCalendarService } from "@calcom/types/Credential";

import { CalendarSubscriptionServiceFactory } from "./CalendarSubscriptionServiceFactory";

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
  async watchCalendar(
    calendarId: string,
    credential: CredentialForCalendarService
  ): Promise<GoogleChannelProps | Office365SubscriptionProps | undefined> {
    log.debug("watchCalendar", safeStringify({ calendarId }));

    try {
      const subscriptionService = await CalendarSubscriptionServiceFactory.createService(credential);
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
      const subscriptionService = await CalendarSubscriptionServiceFactory.createService(credential);
      await subscriptionService.unwatchCalendar(calendarId, channelId, resourceId);
      log.info(`Successfully unwatched calendar ${calendarId}`);
    } catch (error) {
      log.error(`Failed to unwatch calendar ${calendarId}`, safeStringify(error));
      throw error;
    }
  }
}
