import type { CredentialForCalendarService } from "@calcom/types/Credential";

import type { CalendarCacheSqlService } from "./CalendarCacheSqlService";
import type { ICalendarEventRepository } from "./CalendarEventRepository.interface";
import type { ICalendarSubscriptionRepository } from "./CalendarSubscriptionRepository.interface";

export interface WebhookRequest {
  headers: {
    "x-goog-channel-id"?: string;
  };
}

export interface WebhookResponse {
  status: number;
  body: Record<string, any>;
}

export interface WebhookServiceDependencies {
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

export class GoogleCalendarWebhookService {
  constructor(private dependencies: WebhookServiceDependencies) {}

  async processWebhook(request: WebhookRequest): Promise<WebhookResponse> {
    const { headers } = request;
    const { logger } = this.dependencies;
    const channelId = headers["x-goog-channel-id"];

    logger.debug("Processing webhook", { channelId });

    // Validate channel ID
    if (typeof channelId !== "string") {
      return {
        status: 403,
        body: { message: "Missing Channel ID" },
      };
    }

    try {
      // Find subscription by channel ID
      const subscription = await this.dependencies.subscriptionRepo.findByChannelId(channelId);
      if (!subscription) {
        logger.info("No subscription found for channelId", { channelId });
        return {
          status: 200,
          body: { message: "ok" },
        };
      }

      // Check if subscription has a credential
      if (!subscription.selectedCalendar?.credential) {
        logger.info("No credential found for subscription", { channelId });
        return {
          status: 200,
          body: { message: "ok" },
        };
      }

      // Get credential for calendar cache
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

      // Process webhook events
      await this.dependencies.calendarCacheService.processWebhookEvents(
        channelId,
        credentialForCalendarCache
      );

      return {
        status: 200,
        body: { message: "ok" },
      };
    } catch (error) {
      logger.error("Google Calendar SQL webhook error:", { error });
      return {
        status: 500,
        body: { message: "Internal server error" },
      };
    }
  }
}
