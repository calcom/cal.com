import type { CredentialForCalendarService } from "@calcom/types/Credential";

import type { CalendarCacheSqlService } from "../../../features/calendar-cache-sql/CalendarCacheSqlService";
import type { ICalendarEventRepository } from "../../../features/calendar-cache-sql/CalendarEventRepository.interface";
import type { ICalendarSubscriptionRepository } from "../../../features/calendar-cache-sql/CalendarSubscriptionRepository.interface";

export class Office365CalendarWebhookService {
  constructor(
    private dependencies: {
      subscriptionRepo: ICalendarSubscriptionRepository;
      eventRepo: ICalendarEventRepository;
      calendarCacheService: CalendarCacheSqlService;
      getCredentialForCalendarCache: (params: {
        credentialId: number;
      }) => Promise<CredentialForCalendarService | null>;
      logger: {
        debug: (message: string, data?: any) => void;
        info: (message: string, data?: any) => void;
        error: (message: string, data?: any) => void;
      };
    }
  ) {}

  async processWebhook(subscriptionId: string): Promise<{
    status: number;
    body: { message: string } | { error: string };
  }> {
    const { logger } = this.dependencies;

    logger.debug("Processing Office365 webhook", { subscriptionId });

    try {
      const subscription = await this.dependencies.subscriptionRepo.findByOffice365SubscriptionId(
        subscriptionId
      );
      if (!subscription) {
        logger.info("No subscription found for subscriptionId", { subscriptionId });
        return {
          status: 200,
          body: { message: "ok" },
        };
      }

      if (!subscription.selectedCalendar?.credential) {
        logger.info("No credential found for subscription", { subscriptionId });
        return {
          status: 200,
          body: { message: "ok" },
        };
      }

      if (!subscription.selectedCalendar.credential) {
        throw new Error("No credential found for calendar subscription");
      }

      const credentialForCalendarCache = await this.dependencies.getCredentialForCalendarCache({
        credentialId: subscription.selectedCalendar.credential.id,
      });

      if (!credentialForCalendarCache) {
        return {
          status: 404,
          body: { error: "Credential not found" },
        };
      }

      await this.dependencies.calendarCacheService.processWebhookEvents(
        subscriptionId,
        credentialForCalendarCache
      );

      return {
        status: 200,
        body: { message: "ok" },
      };
    } catch (error) {
      logger.error("Office365 Calendar SQL webhook error:", { error });
      return {
        status: 500,
        body: { message: "Internal server error" },
      };
    }
  }
}
