import type { IFeaturesRepository } from "@calcom/features/flags/features.repository.interface";
import type { CredentialForCalendarService } from "@calcom/types/Credential";

import type { ICalendarEventRepository } from "./CalendarEventRepository.interface";
import type { ICalendarSubscriptionRepository } from "./CalendarSubscriptionRepository.interface";

export interface WebhookRequest {
  headers: {
    "x-goog-channel-token"?: string;
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
  featuresRepo: IFeaturesRepository;
  getCredentialForCalendarCache: (params: {
    credentialId: number;
  }) => Promise<CredentialForCalendarService | null>;
  webhookToken: string;
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
    const { logger, webhookToken } = this.dependencies;

    const channelToken = headers["x-goog-channel-token"];
    const channelId = headers["x-goog-channel-id"];

    logger.debug("Processing webhook", { channelToken, channelId });

    // Validate webhook token
    if (channelToken !== webhookToken) {
      return {
        status: 403,
        body: { message: "Invalid API key" },
      };
    }

    // Validate channel ID
    if (typeof channelId !== "string") {
      return {
        status: 403,
        body: { message: "Missing Channel ID" },
      };
    }

    try {
      // Check if SQL cache write is enabled globally
      const isSqlWriteEnabled = await this.dependencies.featuresRepo.checkIfFeatureIsEnabledGlobally(
        "calendar-cache-sql-write"
      );

      if (!isSqlWriteEnabled) {
        logger.debug("SQL cache write not enabled globally");
        return {
          status: 200,
          body: { message: "ok" },
        };
      }

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
      const { CalendarCacheSqlService } = await import("./CalendarCacheSqlService");
      const calendarCacheService = new CalendarCacheSqlService(
        this.dependencies.subscriptionRepo,
        this.dependencies.eventRepo
      );

      await calendarCacheService.processWebhookEvents(channelId, credentialForCalendarCache);

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
